import type { SyncMeta } from './common';

/** Тип кампании (подмножество типов Директа для базовой модели). */
export type CampaignType =
  | 'TEXT_CAMPAIGN'
  | 'DYNAMIC_TEXT_CAMPAIGN'
  | 'MOBILE_APP_CAMPAIGN'
  | 'SMART_CAMPAIGN';

export const CAMPAIGN_TYPES: readonly CampaignType[] = [
  'TEXT_CAMPAIGN',
  'DYNAMIC_TEXT_CAMPAIGN',
  'MOBILE_APP_CAMPAIGN',
  'SMART_CAMPAIGN',
] as const;

/** Статус кампании на стороне Директа. */
export type CampaignStatus =
  | 'DRAFT'
  | 'MODERATION'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'ENDED'
  | 'UNKNOWN';

/** Состояние показов кампании. */
export type CampaignState = 'ON' | 'OFF' | 'SUSPENDED' | 'ENDED' | 'ARCHIVED' | 'CONVERTED';

export interface Campaign extends SyncMeta {
  clientLocalId: number;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  state: CampaignState;
  /** Дневной бюджет в валюте клиента, микро-единицы (1_000_000 = 1 у.е.), null = не задан. */
  dailyBudgetMicros: number | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
}

export interface NewCampaign {
  directId?: number | null;
  clientLocalId: number;
  name: string;
  type: CampaignType;
  status?: CampaignStatus;
  state?: CampaignState;
  dailyBudgetMicros?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}
