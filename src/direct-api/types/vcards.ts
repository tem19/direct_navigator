import type { ActionResult, GetResultPage, Page } from './common';

/** Телефон в визитке. */
export interface Phone {
  CountryCode?: string;
  CityCode: string;
  PhoneNumber: string;
  Extension?: string;
}

/** Поля визитки для `FieldNames`. */
export type VCardFieldName =
  | 'Id'
  | 'CampaignId'
  | 'Company'
  | 'Phone'
  | 'Country'
  | 'City'
  | 'Street'
  | 'House'
  | 'ContactEmail'
  | 'WorkTime';

/** Визитка (неизменяема: только add/delete). */
export interface VCard {
  Id: number;
  CampaignId?: number;
  Company?: string;
  Phone?: Phone;
  Country?: string;
  City?: string;
  ContactEmail?: string;
}

export interface VCardsSelectionCriteria {
  Ids?: number[];
  CampaignIds?: number[];
}

export interface VCardsGetParams {
  SelectionCriteria?: VCardsSelectionCriteria;
  FieldNames: VCardFieldName[];
  Page?: Page;
}

export interface VCardsGetResult extends GetResultPage {
  VCards?: VCard[];
}

/** Визитка для `vcards.add`. */
export interface VCardAddItem {
  CampaignId: number;
  Country: string;
  City: string;
  Company: string;
  Phone: Phone;
  [key: string]: unknown;
}

export interface VCardsAddResult {
  AddResults: ActionResult[];
}

export interface VCardsDeleteResult {
  DeleteResults: ActionResult[];
}
