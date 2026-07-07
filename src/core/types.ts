/**
 * Доменные типы сущностей Яндекс Директа и общей модели синхронизации.
 * Слой `core` не знает про Electron и SQL — только чистые типы и логика.
 */

/** Статус синхронизации локальной строки с сервером Директа. */
export type SyncStatus = 'synced' | 'new' | 'modified' | 'deleted' | 'conflict'

/** Общие поля любой синхронизируемой сущности. */
export interface SyncMeta {
  /** Локальный первичный ключ (autoincrement). */
  localId: number
  /** ID объекта в Яндекс Директе; null пока объект не отправлен на сервер. */
  directId: number | null
  syncStatus: SyncStatus
  /** Снимок серверных полей для детекта конфликтов (hash). */
  serverHash: string | null
  updatedAt: string
}

export type CampaignStatus = 'DRAFT' | 'MODERATION' | 'ACCEPTED' | 'REJECTED' | 'UNKNOWN'

export interface Campaign extends SyncMeta {
  name: string
  status: CampaignStatus
  /** Дневной бюджет в валюте аккаунта; null — без ограничения. */
  dailyBudget: number | null
}

export interface AdGroup extends SyncMeta {
  campaignLocalId: number
  name: string
  /** Регионы показа (гео-таргетинг), список ID регионов. */
  regionIds: number[]
}

export type AdStatus = 'DRAFT' | 'MODERATION' | 'ACCEPTED' | 'REJECTED' | 'UNKNOWN'

export interface Ad extends SyncMeta {
  adGroupLocalId: number
  title: string
  title2: string | null
  text: string
  href: string | null
  status: AdStatus
}

export interface Keyword extends SyncMeta {
  adGroupLocalId: number
  keyword: string
  /** Ставка в валюте аккаунта (в основных единицах, не в микрокопейках). */
  bid: number | null
}

/** Сущности верхнего уровня, которыми оперирует UI-грид. */
export type EntityKind = 'campaign' | 'adGroup' | 'ad' | 'keyword'
