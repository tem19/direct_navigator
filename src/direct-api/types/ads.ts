import type { ActionResult, GetResultPage, Page } from './common';

/** Тип объявления. */
export type AdType =
  | 'TEXT_AD'
  | 'MOBILE_APP_AD'
  | 'DYNAMIC_TEXT_AD'
  | 'IMAGE_AD'
  | 'CPM_BANNER_AD'
  | 'SMART_AD'
  | 'UNKNOWN';

/** Статус объявления. */
export type AdStatus = 'ACCEPTED' | 'DRAFT' | 'MODERATION' | 'PREACCEPTED' | 'REJECTED' | 'UNKNOWN';

/** Состояние показов объявления. */
export type AdState = 'ON' | 'OFF' | 'SUSPENDED' | 'OFF_BY_MONITORING' | 'ARCHIVED' | 'UNKNOWN';

/** Поля объявления для `FieldNames`. */
export type AdFieldName =
  | 'Id'
  | 'AdGroupId'
  | 'CampaignId'
  | 'Type'
  | 'Status'
  | 'State'
  | 'Subtype';

/** Текстовая часть объявления (`TextAdFieldNames`). */
export type TextAdFieldName = 'Title' | 'Title2' | 'Text' | 'Href' | 'DisplayUrlPath' | 'Mobile';

/** Текстовое объявление. */
export interface TextAd {
  Title?: string;
  Title2?: string;
  Text?: string;
  Href?: string;
  Mobile?: 'YES' | 'NO';
}

/** Объявление в ответе `get`. */
export interface Ad {
  Id: number;
  AdGroupId?: number;
  CampaignId?: number;
  Type?: AdType;
  Status?: AdStatus;
  State?: AdState;
  TextAd?: TextAd;
}

export interface AdsSelectionCriteria {
  Ids?: number[];
  AdGroupIds?: number[];
  CampaignIds?: number[];
  Types?: AdType[];
  States?: AdState[];
  Statuses?: AdStatus[];
}

export interface AdsGetParams {
  SelectionCriteria?: AdsSelectionCriteria;
  FieldNames: AdFieldName[];
  TextAdFieldNames?: TextAdFieldName[];
  Page?: Page;
}

export interface AdsGetResult extends GetResultPage {
  Ads?: Ad[];
}

/** Объявление для `ads.add` (минимальный текстовый вариант). */
export interface AdAddItem {
  AdGroupId: number;
  TextAd?: TextAd;
  [key: string]: unknown;
}

export interface AdUpdateItem {
  Id: number;
  [key: string]: unknown;
}

export interface AdsAddResult {
  AddResults: ActionResult[];
}

export interface AdsUpdateResult {
  UpdateResults: ActionResult[];
}

export interface AdsDeleteResult {
  DeleteResults: ActionResult[];
}

export interface AdsActionResult {
  ActionResults: ActionResult[];
}
