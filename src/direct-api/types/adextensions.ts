import type { ActionResult, GetResultPage, Page } from './common';

/** Тип расширения. Сейчас через этот сервис управляются уточнения (Callout). */
export type AdExtensionType = 'CALLOUT' | 'UNKNOWN';

/** Статус модерации расширения. */
export type AdExtensionStatus = 'ACCEPTED' | 'DRAFT' | 'MODERATION' | 'REJECTED' | 'UNKNOWN';

/** Состояние расширения. */
export type AdExtensionState = 'ON' | 'OFF' | 'UNKNOWN';

/** Уточнение (дополнительный текст под объявлением). */
export interface Callout {
  CalloutText: string;
}

/** Поля расширения для `FieldNames`. */
export type AdExtensionFieldName = 'Id' | 'Type' | 'Status' | 'State' | 'Associated';

/** Расширение в ответе `get` (неизменяемо: только add/delete). */
export interface AdExtension {
  Id: number;
  Type?: AdExtensionType;
  Status?: AdExtensionStatus;
  State?: AdExtensionState;
  Callout?: Callout;
}

export interface AdExtensionsSelectionCriteria {
  Ids?: number[];
  Types?: AdExtensionType[];
  States?: AdExtensionState[];
  Statuses?: AdExtensionStatus[];
}

export interface AdExtensionsGetParams {
  SelectionCriteria?: AdExtensionsSelectionCriteria;
  FieldNames: AdExtensionFieldName[];
  CalloutFieldNames?: Array<'CalloutText'>;
  Page?: Page;
}

export interface AdExtensionsGetResult extends GetResultPage {
  AdExtensions?: AdExtension[];
}

/** Расширение для `adextensions.add`. */
export interface AdExtensionAddItem {
  Callout: Callout;
}

export interface AdExtensionsAddResult {
  AddResults: ActionResult[];
}

export interface AdExtensionsDeleteResult {
  DeleteResults: ActionResult[];
}
