import type { Campaign, SyncStatus, CampaignStatus, EntityState } from '../core/types';

/** Форма строки таблицы campaigns как её отдаёт better-sqlite3. */
export interface CampaignRow {
  local_id: number;
  direct_id: number | null;
  name: string;
  status: string;
  state: string;
  daily_budget_amount: number | null;
  sync_status: string;
  server_hash: string | null;
  updated_at_local: string;
  synced_at: string | null;
}

export function rowToCampaign(r: CampaignRow): Campaign {
  return {
    localId: r.local_id,
    directId: r.direct_id,
    name: r.name,
    status: r.status as CampaignStatus,
    state: r.state as EntityState,
    dailyBudgetAmount: r.daily_budget_amount,
    syncStatus: r.sync_status as SyncStatus,
    serverHash: r.server_hash,
    updatedAtLocal: r.updated_at_local,
    syncedAt: r.synced_at,
  };
}
