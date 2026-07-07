import type { Database } from 'better-sqlite3';
import {
  campaignFromRow,
  campaignServerSnapshot,
  computeServerHash,
  nowIso,
  type Campaign,
  type CampaignServerFields,
  type NewCampaign,
} from '../../core';
import type { CampaignRow } from '../../core/mappers/rows';
import { BaseSyncRepository } from './base';

export class CampaignRepository extends BaseSyncRepository<Campaign, CampaignRow> {
  constructor(db: Database) {
    super(db, 'campaigns', campaignFromRow, campaignServerSnapshot);
  }

  /** Все кампании для UI (кроме помеченных на удаление). Используется IPC `campaigns:list`. */
  list(): Campaign[] {
    return this.findAllVisible();
  }

  /** Кампания по локальному id (alias к findByLocalId). */
  getById(localId: number): Campaign | null {
    return this.findByLocalId(localId);
  }

  /** Создать локально новую кампанию (sync_status='new', direct_id=NULL). */
  create(input: NewCampaign): number {
    const info = this.db
      .prepare(
        `INSERT INTO campaigns
           (direct_id, client_local_id, name, type, status, state,
            daily_budget_micros, start_date, end_date,
            sync_status, server_hash, updated_at_local, synced_at)
         VALUES (@directId, @clientLocalId, @name, @type, @status, @state,
                 @dailyBudgetMicros, @startDate, @endDate,
                 'new', NULL, @now, NULL)`,
      )
      .run({
        directId: input.directId ?? null,
        clientLocalId: input.clientLocalId,
        name: input.name,
        type: input.type,
        status: input.status ?? 'DRAFT',
        state: input.state ?? 'OFF',
        dailyBudgetMicros: input.dailyBudgetMicros ?? null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        now: nowIso(),
      });
    return Number(info.lastInsertRowid);
  }

  /** Обновить локальные поля и пометить modified. */
  update(localId: number, patch: Partial<Omit<NewCampaign, 'clientLocalId'>>): void {
    const current = this.findByLocalId(localId);
    if (!current) throw new Error(`campaign ${localId} not found`);
    const next = {
      name: patch.name ?? current.name,
      type: patch.type ?? current.type,
      status: patch.status ?? current.status,
      state: patch.state ?? current.state,
      dailyBudgetMicros:
        patch.dailyBudgetMicros !== undefined ? patch.dailyBudgetMicros : current.dailyBudgetMicros,
      startDate: patch.startDate !== undefined ? patch.startDate : current.startDate,
      endDate: patch.endDate !== undefined ? patch.endDate : current.endDate,
    };
    this.db
      .prepare(
        `UPDATE campaigns
           SET name=@name, type=@type, status=@status, state=@state,
               daily_budget_micros=@dailyBudgetMicros, start_date=@startDate, end_date=@endDate
         WHERE local_id=@localId`,
      )
      .run({ ...next, localId });
    this.markModified(localId);
  }

  /**
   * Применить серверные данные (pull). Вставляет новую строку или обновляет
   * существующую по direct_id. Если локально были правки (modified/conflict)
   * и сервер тоже изменился — помечает conflict, сохраняя локальные значения.
   */
  upsertFromServer(server: CampaignServerFields, clientLocalId: number): void {
    const snapshotHash = computeServerHash(campaignServerSnapshot(server as unknown as Campaign));
    const existing = this.findByDirectId(server.directId);

    if (!existing) {
      this.db
        .prepare(
          `INSERT INTO campaigns
             (direct_id, client_local_id, name, type, status, state,
              daily_budget_micros, start_date, end_date,
              sync_status, server_hash, updated_at_local, synced_at)
           VALUES (@directId, @clientLocalId, @name, @type, @status, @state,
                   @dailyBudgetMicros, @startDate, @endDate,
                   'synced', @hash, @now, @now)`,
        )
        .run({ ...server, clientLocalId, hash: snapshotHash, now: nowIso() });
      return;
    }

    const locallyEdited = existing.syncStatus === 'modified' || existing.syncStatus === 'conflict';
    if (locallyEdited && existing.serverHash !== snapshotHash) {
      this.markConflict(existing.localId);
      return;
    }

    // Локальных правок нет (synced) либо сервер не менялся — принимаем серверные данные.
    this.db
      .prepare(
        `UPDATE campaigns
           SET name=@name, type=@type, status=@status, state=@state,
               daily_budget_micros=@dailyBudgetMicros, start_date=@startDate, end_date=@endDate,
               sync_status='synced', server_hash=@hash, synced_at=@now
         WHERE local_id=@localId`,
      )
      .run({ ...server, hash: snapshotHash, now: nowIso(), localId: existing.localId });
  }
}
