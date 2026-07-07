import type { ActionResult, GetResultPage, Page } from './common';

/** Поля ставок для `FieldNames`. */
export type KeywordBidFieldName =
  | 'KeywordId'
  | 'AdGroupId'
  | 'CampaignId'
  | 'ServingStatus'
  | 'StrategyPriority';

/** Поля ставок на поиске (`SearchFieldNames`). */
export type KeywordBidSearchFieldName = 'Bid' | 'AuctionBids';
/** Поля ставок в сетях (`NetworkFieldNames`). */
export type KeywordBidNetworkFieldName = 'Bid' | 'Coverage';

export interface KeywordBid {
  KeywordId?: number;
  AdGroupId?: number;
  CampaignId?: number;
  Search?: { Bid?: number };
  Network?: { Bid?: number };
}

export interface KeywordBidsSelectionCriteria {
  KeywordIds?: number[];
  AdGroupIds?: number[];
  CampaignIds?: number[];
}

export interface KeywordBidsGetParams {
  SelectionCriteria?: KeywordBidsSelectionCriteria;
  FieldNames: KeywordBidFieldName[];
  SearchFieldNames?: KeywordBidSearchFieldName[];
  NetworkFieldNames?: KeywordBidNetworkFieldName[];
  Page?: Page;
}

export interface KeywordBidsGetResult extends GetResultPage {
  KeywordBids?: KeywordBid[];
}

/**
 * Ставка для `keywordbids.set`. Указывается уровень применения
 * (KeywordId | AdGroupId | CampaignId) и значения Bid/ContextBid.
 */
export interface KeywordBidSetItem {
  KeywordId?: number;
  AdGroupId?: number;
  CampaignId?: number;
  /** Ставка на поиске (в валюте × 1_000_000). */
  Bid?: number;
  /** Ставка в сетях. */
  ContextBid?: number;
  [key: string]: unknown;
}

export interface KeywordBidsSetParams {
  KeywordBids: KeywordBidSetItem[];
}

export interface KeywordBidsSetResult {
  SetResults: ActionResult[];
}
