import type { SyncMeta, SyncStatus } from '../types/common';
import { SYNC_STATUSES } from '../types/common';
import type { SyncRowBase } from './rows';

export function toSyncStatus(raw: string): SyncStatus {
  if ((SYNC_STATUSES as readonly string[]).includes(raw)) {
    return raw as SyncStatus;
  }
  throw new Error(`Unknown sync_status: ${raw}`);
}

/** Общая часть dbRow -> domain для sync-метаданных. */
export function syncMetaFromRow(row: SyncRowBase): SyncMeta {
  return {
    localId: row.local_id,
    directId: row.direct_id,
    syncStatus: toSyncStatus(row.sync_status),
    serverHash: row.server_hash,
    updatedAtLocal: row.updated_at_local,
    syncedAt: row.synced_at,
  };
}
