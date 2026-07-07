import type { ActionResult, GetResultPage, Page } from './common';

/** Тип группы объявлений. */
export type AdGroupType =
  | 'TEXT_AD_GROUP'
  | 'MOBILE_APP_AD_GROUP'
  | 'DYNAMIC_TEXT_AD_GROUP'
  | 'CPM_BANNER_AD_GROUP'
  | 'SMART_AD_GROUP'
  | 'UNKNOWN';

/** Статус группы. */
export type AdGroupStatus = 'ACCEPTED' | 'DRAFT' | 'MODERATION' | 'PREACCEPTED' | 'REJECTED' | 'UNKNOWN';

/** Поля группы для `FieldNames`. */
export type AdGroupFieldName =
  | 'Id'
  | 'Name'
  | 'CampaignId'
  | 'Type'
  | 'Status'
  | 'ServingStatus'
  | 'RegionIds'
  | 'NegativeKeywords'
  | 'TrackingParams';

/** Группа объявлений в ответе `get`. */
export interface AdGroup {
  Id: number;
  Name?: string;
  CampaignId?: number;
  Type?: AdGroupType;
  Status?: AdGroupStatus;
  RegionIds?: number[];
}

export interface AdGroupsSelectionCriteria {
  Ids?: number[];
  CampaignIds?: number[];
  Types?: AdGroupType[];
  Statuses?: AdGroupStatus[];
}

export interface AdGroupsGetParams {
  SelectionCriteria?: AdGroupsSelectionCriteria;
  FieldNames: AdGroupFieldName[];
  Page?: Page;
}

export interface AdGroupsGetResult extends GetResultPage {
  AdGroups?: AdGroup[];
}

/** Группа для `adgroups.add` (минимальный текстовый вариант). */
export interface AdGroupAddItem {
  Name: string;
  CampaignId: number;
  RegionIds: number[];
  [key: string]: unknown;
}

export interface AdGroupUpdateItem {
  Id: number;
  [key: string]: unknown;
}

export interface AdGroupsAddResult {
  AddResults: ActionResult[];
}

export interface AdGroupsUpdateResult {
  UpdateResults: ActionResult[];
}

export interface AdGroupsDeleteResult {
  DeleteResults: ActionResult[];
}
