import type { ActionResult, GetResultPage, Page } from './common';

/** Статус кампании. */
export type CampaignStatus =
  | 'ACCEPTED'
  | 'DRAFT'
  | 'MODERATION'
  | 'REJECTED'
  | 'ENDED'
  | 'CONVERTED'
  | 'UNKNOWN';

/** Статус показов кампании. */
export type CampaignStatusShow = 'YES' | 'NO';

/** Состояние кампании (жизненный цикл). */
export type CampaignState =
  | 'CONVERTED'
  | 'ARCHIVED'
  | 'SUSPENDED'
  | 'ENDED'
  | 'ON'
  | 'OFF'
  | 'UNKNOWN';

/** Поля кампании, доступные в `FieldNames`. */
export type CampaignFieldName =
  | 'Id'
  | 'Name'
  | 'Type'
  | 'Status'
  | 'State'
  | 'StatusShow'
  | 'StatusPayment'
  | 'StartDate'
  | 'EndDate'
  | 'Currency'
  | 'DailyBudget'
  | 'Funds'
  | 'ClientInfo';

/** Тип кампании. */
export type CampaignType =
  | 'TEXT_CAMPAIGN'
  | 'MOBILE_APP_CAMPAIGN'
  | 'DYNAMIC_TEXT_CAMPAIGN'
  | 'SMART_CAMPAIGN'
  | 'CPM_BANNER_CAMPAIGN'
  | 'UNKNOWN';

/** Кампания в ответе `get` (набор полей зависит от `FieldNames`). */
export interface Campaign {
  Id: number;
  Name?: string;
  Type?: CampaignType;
  Status?: CampaignStatus;
  State?: CampaignState;
  StatusShow?: CampaignStatusShow;
  StartDate?: string;
  EndDate?: string;
  Currency?: string;
  DailyBudget?: { Amount: number; Mode: 'STANDARD' | 'DISTRIBUTED' };
}

/** Критерии выборки для `campaigns.get`. */
export interface CampaignsSelectionCriteria {
  Ids?: number[];
  Types?: CampaignType[];
  States?: CampaignState[];
  Statuses?: CampaignStatus[];
}

export interface CampaignsGetParams {
  SelectionCriteria?: CampaignsSelectionCriteria;
  FieldNames: CampaignFieldName[];
  Page?: Page;
}

export interface CampaignsGetResult extends GetResultPage {
  Campaigns?: Campaign[];
}

/** Кампания для `campaigns.add` (минимальный текстовый вариант). */
export interface CampaignAddItem {
  Name: string;
  StartDate: string;
  TextCampaign?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CampaignsAddParams {
  Campaigns: CampaignAddItem[];
}

export interface CampaignsAddResult {
  AddResults: ActionResult[];
}

export interface CampaignUpdateItem {
  Id: number;
  [key: string]: unknown;
}

export interface CampaignsUpdateParams {
  Campaigns: CampaignUpdateItem[];
}

export interface CampaignsUpdateResult {
  UpdateResults: ActionResult[];
}

/** Общий формат параметров статусных методов и delete: список Id. */
export interface CampaignsIdsParams {
  SelectionCriteria: { Ids: number[] };
}

export interface CampaignsActionResult {
  ActionResults: ActionResult[];
}

export interface CampaignsDeleteResult {
  DeleteResults: ActionResult[];
}
