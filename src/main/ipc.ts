import { ipcMain } from 'electron';
import { CHANNELS, type SyncProgress } from '../preload/contracts';
import { LATEST_SCHEMA_VERSION } from '../db/migrations';
import type { DB } from '../db/connection';
import { CampaignRepository } from '../db/repositories/campaigns';
import type { TokenStore } from './token-store';

/**
 * Регистрирует все IPC-хендлеры. Renderer вызывает их через window.api.
 * Здесь — единственная точка, где renderer-запросы встречаются с БД/токеном.
 */
export function registerIpc(db: DB, tokens: TokenStore): void {
  const campaigns = new CampaignRepository(db);

  ipcMain.handle(CHANNELS.tokenSet, (_e, token: string) => {
    tokens.set(token);
  });
  ipcMain.handle(CHANNELS.tokenHas, () => tokens.has());
  ipcMain.handle(CHANNELS.tokenClear, () => tokens.clear());

  ipcMain.handle(CHANNELS.campaignsList, () => campaigns.list());

  // Заглушки движка синхронизации — наполнит команда /sync-engine.
  const idleProgress = (): SyncProgress => ({
    phase: 'idle',
    processed: 0,
    total: 0,
    unitsSpent: 0,
    message: 'Движок синхронизации ещё не подключён (см. /sync-engine)',
  });
  ipcMain.handle(CHANNELS.syncPull, idleProgress);
  ipcMain.handle(CHANNELS.syncPush, idleProgress);

  ipcMain.handle(CHANNELS.systemPing, () => ({
    ok: true as const,
    schemaVersion: LATEST_SCHEMA_VERSION,
  }));
}
