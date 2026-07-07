/**
 * Доменные типы уровня core. Без Electron и SQL — только чистые данные.
 * Иерархия Директа: Client → Campaign → AdGroup → (Ad | Keyword).
 */

/** Статус синхронизации локальной строки с Яндекс Директом. */
export type SyncStatus = 'synced' | 'new' | 'modified' | 'deleted' | 'conflict';

/** Поля синхронизации, общие для всех синхронизируемых сущностей. */
export interface SyncMeta {
  /** ID в Яндекс Директе. null, пока объект не выгружен на сервер. */
  directId: number | null;
  syncStatus: SyncStatus;
  /** Хэш снимка серверных полей — для детекта конфликтов при pull. */
  serverHash: string | null;
  updatedAtLocal: string; // ISO-8601
  syncedAt: string | null; // ISO-8601
}

export type CampaignStatus = 'DRAFT' | 'MODERATION' | 'ACCEPTED' | 'REJECTED' | 'ENDED';
export type EntityState = 'ON' | 'OFF' | 'SUSPENDED' | 'ARCHIVED';

export interface Campaign extends SyncMeta {
  localId: number;
  name: string;
  status: CampaignStatus;
  state: EntityState;
  dailyBudgetAmount: number | null; // в валюте аккаунта, целое (микроединицы у API маппятся отдельно)
}

export interface AdGroup extends SyncMeta {
  localId: number;
  campaignLocalId: number;
  name: string;
  regionIds: number[];
}

export type AdType = 'TEXT_AD' | 'MOBILE_APP_AD' | 'DYNAMIC_TEXT_AD';

export interface Ad extends SyncMeta {
  localId: number;
  adGroupLocalId: number;
  type: AdType;
  title: string; // Заголовок 1
  title2: string | null; // Заголовок 2
  text: string;
  href: string | null;
  state: EntityState;
}

export interface Keyword extends SyncMeta {
  localId: number;
  adGroupLocalId: number;
  keyword: string; // фраза с минус-словами
  bid: number | null; // ставка на поиске, в валюте аккаунта
  state: EntityState;
}

/** Любая синхронизируемая доменная сущность. */
export type SyncEntity = Campaign | AdGroup | Ad | Keyword;

/** Имена сущностей — используются в репозиториях и движке синхронизации. */
export type EntityKind = 'campaign' | 'adgroup' | 'ad' | 'keyword';
