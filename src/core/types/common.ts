/**
 * Общие доменные типы синхронизации.
 *
 * Слой `core` не знает про Electron и SQL — здесь только чистые TS-типы.
 */

/** Статус синхронизации локальной строки с Яндекс Директом. */
export type SyncStatus =
  | 'synced' // совпадает с сервером
  | 'new' // создано локально, ещё не выгружено (direct_id = null)
  | 'modified' // изменено локально после последней синхронизации
  | 'deleted' // помечено на удаление (мягкое удаление)
  | 'conflict'; // сервер изменился параллельно с локальной правкой

export const SYNC_STATUSES: readonly SyncStatus[] = [
  'synced',
  'new',
  'modified',
  'deleted',
  'conflict',
] as const;

/**
 * Метаданные синхронизации, общие для всех синхронизируемых сущностей.
 * `directId` = ID в Яндекс Директе (null пока строка не выгружена).
 * `serverHash` = снимок серверных полей для детекта конфликтов.
 */
export interface SyncMeta {
  localId: number;
  directId: number | null;
  syncStatus: SyncStatus;
  serverHash: string | null;
  updatedAtLocal: string; // ISO-8601 UTC
  syncedAt: string | null; // ISO-8601 UTC, null если ещё не синхронизировано
}

/** Поля для создания новой сущности (без сгенерированных БД полей). */
export type NewEntityMeta = {
  directId?: number | null;
};

/** ISO-8601 UTC-строка текущего момента. */
export function nowIso(): string {
  return new Date().toISOString();
}
