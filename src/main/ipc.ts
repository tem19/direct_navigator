import { ipcMain } from 'electron';
import { CHANNELS, type SyncProgress } from '../preload/contracts';
import { LATEST_SCHEMA_VERSION } from '../db/migrations';
import type { DB } from '../db/connection';
import { CampaignRepository } from '../db/repositories/campaigns';
import { ConflictRepository } from '../db/repositories/conflicts';
import { SyncStateRepository } from '../db/repositories/sync-state';
import { DirectClient } from '../direct-api/client';
import { SyncEngine } from '../sync/engine';
import type { SyncResult } from '../sync/types';
import type { TokenStore } from './token-store';

const SANDBOX_BASE = 'https://api-sandbox.direct.yandex.com/json/v5/';

function toProgress(phase: SyncProgress['phase'], r: SyncResult): SyncProgress {
  return {
    phase,
    processed: r.pulled + r.pushed,
    total: r.pulled + r.pushed,
    unitsSpent: r.units?.spent ?? 0,
    message:
      r.failures > 0
        ? `Готово с ошибками: ${r.failures}${r.firstError ? ` — ${r.firstError}` : ''}. Конфликтов: ${r.conflicts}.`
        : `Готово: подтянуто ${r.pulled}, отправлено ${r.pushed}. Конфликтов: ${r.conflicts}.`,
  };
}

/**
 * Регистрирует IPC-хендлеры. Renderer вызывает их через window.api.
 * Здесь — единственная точка, где renderer-запросы встречаются с БД/токеном/API.
 */
export function registerIpc(db: DB, tokens: TokenStore): void {
  const campaigns = new CampaignRepository(db);
  const conflicts = new ConflictRepository(db);
  const syncState = new SyncStateRepository(db);

  const buildEngine = (): SyncEngine => {
    const client = new DirectClient({
      baseUrl: process.env['YANDEX_API_BASE'] || SANDBOX_BASE,
      getToken: () => tokens.get(),
      clientLogin: process.env['YANDEX_CLIENT_LOGIN'] || undefined,
    });
    return new SyncEngine({ client, campaigns, conflicts, syncState });
  };

  ipcMain.handle(CHANNELS.tokenSet, (_e, token: string) => {
    tokens.set(token);
  });
  ipcMain.handle(CHANNELS.tokenHas, () => tokens.has());
  ipcMain.handle(CHANNELS.tokenClear, () => tokens.clear());

  ipcMain.handle(CHANNELS.campaignsList, () => campaigns.list());
  ipcMain.handle(CHANNELS.campaignsCreate, (_e, name: string) =>
    campaigns.insert({ name }),
  );

  ipcMain.handle(CHANNELS.syncPull, async (): Promise<SyncProgress> => {
    if (!tokens.has()) {
      return { phase: 'error', processed: 0, total: 0, unitsSpent: 0, message: 'Токен не задан' };
    }
    try {
      const result = await buildEngine().pull();
      return toProgress('done', result);
    } catch (e) {
      return errorProgress(e);
    }
  });

  ipcMain.handle(CHANNELS.syncPush, async (): Promise<SyncProgress> => {
    if (!tokens.has()) {
      return { phase: 'error', processed: 0, total: 0, unitsSpent: 0, message: 'Токен не задан' };
    }
    try {
      const result = await buildEngine().push();
      return toProgress('done', result);
    } catch (e) {
      return errorProgress(e);
    }
  });

  ipcMain.handle(CHANNELS.systemPing, () => ({
    ok: true as const,
    schemaVersion: LATEST_SCHEMA_VERSION,
  }));
}

function errorProgress(e: unknown): SyncProgress {
  return {
    phase: 'error',
    processed: 0,
    total: 0,
    unitsSpent: 0,
    message: e instanceof Error ? e.message : 'Ошибка синхронизации',
  };
}
