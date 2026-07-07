import { hashServerSnapshot } from '../core/hash';
import type { Campaign } from '../core/types';
import type { DirectClient } from '../direct-api/client';
import { CampaignsService } from '../direct-api/services/campaigns';
import { ChangesService } from '../direct-api/services/changes';
import type { CampaignAddItem, CampaignGetItem } from '../direct-api/types/campaigns';
import type { Units } from '../direct-api/types/common';
import type { CampaignRepository } from '../db/repositories/campaigns';
import type { ConflictRepository } from '../db/repositories/conflicts';
import type { SyncStateRepository } from '../db/repositories/sync-state';
import type { ProgressCallback, SyncResult } from './types';

export interface SyncDeps {
  client: DirectClient;
  campaigns: CampaignRepository;
  conflicts: ConflictRepository;
  syncState: SyncStateRepository;
  onProgress?: ProgressCallback;
}

/** Снимок серверных полей кампании, по которому считаем hash для конфликтов. */
function serverSnapshot(item: CampaignGetItem): Record<string, unknown> {
  return { name: item.Name, status: item.Status, state: item.State };
}

/**
 * Минимально валидный payload для campaigns.add в песочнице:
 * имя + дата старта (сегодня) + ручная стратегия (сеть выключена).
 */
function buildAddItem(name: string): CampaignAddItem {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return {
    Name: name,
    StartDate: today,
    TextCampaign: {
      BiddingStrategy: {
        Search: { BiddingStrategyType: 'HIGHEST_POSITION' },
        Network: { BiddingStrategyType: 'SERVING_OFF' },
      },
    },
  };
}

/**
 * Движок синхронизации локальной БД с Яндекс Директом.
 * Пока охватывает кампании; расширяется на остальные сущности в том же стиле
 * (родители раньше детей при push).
 */
export class SyncEngine {
  private readonly campaignsApi: CampaignsService;
  private readonly changesApi: ChangesService;
  private lastUnits: Units | null = null;

  constructor(private readonly deps: SyncDeps) {
    this.campaignsApi = new CampaignsService(deps.client);
    this.changesApi = new ChangesService(deps.client);
  }

  get units(): Units | null {
    return this.lastUnits;
  }

  /** Полная синхронизация: сначала подтянуть сервер, затем отправить локальное. */
  async full(): Promise<SyncResult> {
    const pull = await this.pull();
    const push = await this.push();
    return {
      pulled: pull.pulled,
      pushed: push.pushed,
      conflicts: this.deps.conflicts.count(),
      failures: pull.failures + push.failures,
      units: this.lastUnits,
      firstError: push.firstError,
    };
  }

  /** Pull: инкрементально через changes, при первичной загрузке — полный get. */
  async pull(): Promise<SyncResult> {
    const { syncState, onProgress } = this.deps;
    const ts = syncState.getTimestamp('campaign');
    const check = await this.changesApi.checkCampaigns(ts ?? undefined);
    this.captureUnits();

    let serverItems: CampaignGetItem[];
    if (!ts || check.ForceRefresh === 'YES') {
      serverItems = await this.campaignsApi.getAll();
    } else {
      const ids = check.Modified?.CampaignIds ?? [];
      serverItems = await this.campaignsApi.getByIds(ids);
    }
    this.captureUnits();

    let processed = 0;
    for (const item of serverItems) {
      this.applyServerCampaign(item);
      processed++;
      onProgress?.({
        phase: 'pull',
        processed,
        total: serverItems.length,
        unitsSpent: this.lastUnits?.spent ?? 0,
        conflicts: this.deps.conflicts.count(),
        failures: 0,
      });
    }

    syncState.setTimestamp('campaign', check.Timestamp);
    return {
      pulled: processed,
      pushed: 0,
      conflicts: this.deps.conflicts.count(),
      failures: 0,
      units: this.lastUnits,
    };
  }

  private applyServerCampaign(item: CampaignGetItem): void {
    const { campaigns, conflicts } = this.deps;
    const snapshot = serverSnapshot(item);
    const newHash = hashServerSnapshot(snapshot);
    const local = campaigns.findByDirectId(item.Id);

    if (!local) {
      campaigns.insertFromServer({
        directId: item.Id,
        name: item.Name,
        status: item.Status,
        state: item.State,
        serverHash: newHash,
      });
      return;
    }

    if (local.syncStatus === 'synced') {
      campaigns.updateFromServer(local.localId, {
        name: item.Name,
        status: item.Status,
        state: item.State,
        serverHash: newHash,
      });
      return;
    }

    if (local.syncStatus === 'modified') {
      // Сервер изменился с момента нашего снимка → конфликт (не затираем правки).
      if (local.serverHash !== newHash) {
        conflicts.upsert({
          entityKind: 'campaign',
          localId: local.localId,
          directId: item.Id,
          local: this.localSnapshot(local),
          server: snapshot,
        });
        campaigns.markConflict(local.localId);
      }
      // Иначе сервер не менялся — оставляем локальные правки как есть.
    }
    // conflict/deleted/new — оставляем для ручного разрешения либо push.
  }

  /** Push: new → add, modified → update, deleted → delete. Поэлементный разбор. */
  async push(): Promise<SyncResult> {
    const { campaigns, onProgress } = this.deps;
    const pending = campaigns.listPending();
    const toAdd = pending.filter((c) => c.syncStatus === 'new');
    const toUpdate = pending.filter((c) => c.syncStatus === 'modified');
    const toDelete = pending.filter((c) => c.syncStatus === 'deleted');

    let pushed = 0;
    let failures = 0;

    let firstError: string | undefined;
    const noteError = (msg: string | undefined): void => {
      if (msg && !firstError) firstError = msg;
    };

    // --- add ---
    if (toAdd.length > 0) {
      const itemByLocalId = new Map<CampaignAddItem, number>();
      const items: CampaignAddItem[] = toAdd.map((c) => {
        const item = buildAddItem(c.name);
        itemByLocalId.set(item, c.localId);
        return item;
      });
      const result = await this.campaignsApi.add(items);
      this.captureUnits();
      for (const ok of result.succeeded) {
        const localId = itemByLocalId.get(ok.input);
        if (localId != null && ok.id != null) {
          const c = campaigns.getByLocalId(localId);
          const hash = c ? hashServerSnapshot(this.localSnapshot(c)) : '';
          campaigns.markSynced(localId, ok.id, hash);
          pushed++;
        }
      }
      result.failed.forEach((f) => noteError(f.errors[0]?.Message));
      failures += result.failed.length;
    }

    // --- update ---
    if (toUpdate.length > 0) {
      const idToLocal = new Map<number, number>();
      const items = toUpdate
        .filter((c) => c.directId != null)
        .map((c) => {
          idToLocal.set(c.directId as number, c.localId);
          return { Id: c.directId as number, Name: c.name };
        });
      const result = await this.campaignsApi.update(items);
      this.captureUnits();
      for (const ok of result.succeeded) {
        const localId = idToLocal.get(ok.input.Id);
        if (localId != null) {
          const c = campaigns.getByLocalId(localId);
          const hash = c ? hashServerSnapshot(this.localSnapshot(c)) : '';
          campaigns.refreshServerHash(localId, hash);
          pushed++;
        }
      }
      result.failed.forEach((f) => noteError(f.errors[0]?.Message));
      failures += result.failed.length;
    }

    // --- delete ---
    if (toDelete.length > 0) {
      const ids = toDelete.map((c) => c.directId).filter((id): id is number => id != null);
      const idToLocal = new Map<number, number>();
      toDelete.forEach((c) => {
        if (c.directId != null) idToLocal.set(c.directId, c.localId);
      });
      const result = await this.campaignsApi.delete(ids);
      this.captureUnits();
      for (const ok of result.succeeded) {
        const localId = idToLocal.get(ok.input);
        if (localId != null) {
          campaigns.hardDelete(localId);
          pushed++;
        }
      }
      result.failed.forEach((f) => noteError(f.errors[0]?.Message));
      failures += result.failed.length;
    }

    onProgress?.({
      phase: 'push',
      processed: pushed,
      total: pending.length,
      unitsSpent: this.lastUnits?.spent ?? 0,
      conflicts: this.deps.conflicts.count(),
      failures,
    });

    return {
      pulled: 0,
      pushed,
      conflicts: this.deps.conflicts.count(),
      failures,
      units: this.lastUnits,
      firstError,
    };
  }

  private localSnapshot(c: Campaign): Record<string, unknown> {
    return { name: c.name, status: c.status, state: c.state };
  }

  private captureUnits(): void {
    this.lastUnits = this.deps.client.lastUnits;
  }
}
