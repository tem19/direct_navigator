import type { ApiIssue, LimitedBy } from './common';

/** Поля кампании при get (SelectionCriteria + FieldNames). */
export interface CampaignGetItem {
  Id: number;
  Name: string;
  Status: string;
  State: string;
  DailyBudget?: { Amount: number; Mode: string };
}

export interface CampaignsGetResult extends Partial<LimitedBy> {
  Campaigns?: CampaignGetItem[];
}

export interface CampaignAddItem {
  Name: string;
  /** Тип кампании задаётся вложенным объектом; для примера — TextCampaign. */
  TextCampaign?: Record<string, unknown>;
}

export interface AddResult {
  Id?: number;
  Errors?: ApiIssue[];
  Warnings?: ApiIssue[];
}

export interface CampaignsAddResult {
  AddResults?: AddResult[];
}

export interface CampaignUpdateItem {
  Id: number;
  Name?: string;
}

export interface UpdateResult {
  Id?: number;
  Errors?: ApiIssue[];
  Warnings?: ApiIssue[];
}

export interface CampaignsUpdateResult {
  UpdateResults?: UpdateResult[];
}

export interface DeleteResult {
  Id?: number;
  Errors?: ApiIssue[];
  Warnings?: ApiIssue[];
}

export interface CampaignsDeleteResult {
  DeleteResults?: DeleteResult[];
}
