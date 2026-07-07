import type { ActionResult, GetResultPage, Page } from './common';

/** Статус ключевой фразы. */
export type KeywordStatus = 'ACCEPTED' | 'DRAFT' | 'MODERATION' | 'REJECTED' | 'UNKNOWN';

/** Состояние ключевой фразы. */
export type KeywordState = 'ON' | 'OFF' | 'SUSPENDED' | 'UNKNOWN';

/** Поля ключевой фразы для `FieldNames`. */
export type KeywordFieldName =
  | 'Id'
  | 'Keyword'
  | 'AdGroupId'
  | 'CampaignId'
  | 'Status'
  | 'State'
  | 'ServingStatus'
  | 'Bid'
  | 'ContextBid';

/** Ключевая фраза в ответе `get`. */
export interface Keyword {
  Id: number;
  Keyword?: string;
  AdGroupId?: number;
  CampaignId?: number;
  Status?: KeywordStatus;
  State?: KeywordState;
  Bid?: number;
  ContextBid?: number;
}

export interface KeywordsSelectionCriteria {
  Ids?: number[];
  AdGroupIds?: number[];
  CampaignIds?: number[];
  States?: KeywordState[];
  Statuses?: KeywordStatus[];
}

export interface KeywordsGetParams {
  SelectionCriteria?: KeywordsSelectionCriteria;
  FieldNames: KeywordFieldName[];
  Page?: Page;
}

export interface KeywordsGetResult extends GetResultPage {
  Keywords?: Keyword[];
}

/** Ключевая фраза для `keywords.add`. */
export interface KeywordAddItem {
  Keyword: string;
  AdGroupId: number;
  Bid?: number;
  ContextBid?: number;
  [key: string]: unknown;
}

export interface KeywordUpdateItem {
  Id: number;
  [key: string]: unknown;
}

export interface KeywordsAddResult {
  AddResults: ActionResult[];
}

export interface KeywordsUpdateResult {
  UpdateResults: ActionResult[];
}

export interface KeywordsDeleteResult {
  DeleteResults: ActionResult[];
}

export interface KeywordsActionResult {
  ActionResults: ActionResult[];
}
