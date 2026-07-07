import type { ActionResult, GetResultPage, Page } from './common';

/** Одна быстрая ссылка внутри набора. */
export interface Sitelink {
  Title: string;
  Href?: string;
  Description?: string;
  TurbolandingId?: number;
}

/** Поля быстрой ссылки для `SitelinkFieldNames`. */
export type SitelinkFieldName = 'Title' | 'Href' | 'Description' | 'TurbolandingId';

/** Поля набора для `FieldNames`. */
export type SitelinksSetFieldName = 'Id' | 'Sitelinks';

/** Набор быстрых ссылок (неизменяемый: только add/delete). */
export interface SitelinksSet {
  Id: number;
  Sitelinks?: Sitelink[];
}

export interface SitelinksSelectionCriteria {
  Ids?: number[];
}

export interface SitelinksGetParams {
  SelectionCriteria?: SitelinksSelectionCriteria;
  FieldNames: SitelinksSetFieldName[];
  SitelinkFieldNames?: SitelinkFieldName[];
  Page?: Page;
}

export interface SitelinksGetResult extends GetResultPage {
  SitelinksSets?: SitelinksSet[];
}

/** Набор для `sitelinks.add`. */
export interface SitelinksSetAddItem {
  Sitelinks: Sitelink[];
}

export interface SitelinksAddResult {
  AddResults: ActionResult[];
}

export interface SitelinksDeleteResult {
  DeleteResults: ActionResult[];
}
