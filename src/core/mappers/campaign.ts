import type { Campaign, CampaignState, CampaignStatus, CampaignType } from '../types/campaign';
import type { CampaignRow } from './rows';
import { syncMetaFromRow } from './syncMeta';

/** Серверно-владелые поля Campaign (то, что приходит из Direct и пишется при pull). */
export interface CampaignServerFields {
  directId: number;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  state: CampaignState;
  dailyBudgetMicros: number | null;
  startDate: string | null;
  endDate: string | null;
}

/** Форма элемента ответа Direct API `campaigns.get`. */
export interface CampaignApiRow {
  Id: number;
  Name: string;
  Type: string;
  Status?: string;
  State?: string;
  DailyBudget?: { Amount?: number } | null;
  StartDate?: string | null;
  EndDate?: string | null;
}

/** dbRow -> domain */
export function campaignFromRow(row: CampaignRow): Campaign {
  return {
    ...syncMetaFromRow(row),
    clientLocalId: row.client_local_id,
    name: row.name,
    type: row.type as CampaignType,
    status: row.status as CampaignStatus,
    state: row.state as CampaignState,
    dailyBudgetMicros: row.daily_budget_micros,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}

/** apiRow -> серверные поля (sync-мету проставляет репозиторий при pull). */
export function campaignFromApi(api: CampaignApiRow): CampaignServerFields {
  return {
    directId: api.Id,
    name: api.Name,
    type: api.Type as CampaignType,
    status: (api.Status ?? 'UNKNOWN') as CampaignStatus,
    state: (api.State ?? 'OFF') as CampaignState,
    dailyBudgetMicros: api.DailyBudget?.Amount ?? null,
    startDate: api.StartDate ?? null,
    endDate: api.EndDate ?? null,
  };
}

/** Серверный снимок для server_hash (только серверно-владелые поля). */
export function campaignServerSnapshot(
  c: Pick<Campaign, keyof Omit<CampaignServerFields, 'directId'>>,
): Record<string, unknown> {
  return {
    name: c.name,
    type: c.type,
    status: c.status,
    state: c.state,
    dailyBudgetMicros: c.dailyBudgetMicros,
    startDate: c.startDate,
    endDate: c.endDate,
  };
}
