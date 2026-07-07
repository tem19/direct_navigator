/**
 * Порты движка синхронизации — интерфейсы, через которые `sync/` общается с
 * остальными слоями. Реальные реализации живут в `src/db/repositories`
 * (SQL) и `src/direct-api` (HTTP). Здесь — только контракты, чтобы движок
 * тестировался на моках и не тянул ни Electron, ни `better-sqlite3`.
 */

import type {
  BulkResult,
  ChangesResult,
  CheckDictResult,
  Conflict,
  EntityType,
  LocalId,
  OperationLogEntry,
  ServerObject,
  SyncRow,
  UnitsInfo,
} from './types';

/** Данные для вставки серверной строки как `synced`. */
export interface NewSyncedRow {
  entityType: EntityType;
  directId: number;
  parentDirectId: number | null;
  fields: Record<string, unknown>;
  serverHash: string;
  syncedAt: number;
}

/**
 * Доступ к синхронизируемым строкам БД. Единственный код, знающий SQL —
 * реализация этого порта в `db/repositories`.
 */
export interface EntityRepository {
  /** Строки в статусах `new | modified | deleted` для данного типа. */
  getDirtyRows(entityType: EntityType): SyncRow[];

  /** Строка по `direct_id` (для применения серверного ответа при pull). */
  getByDirectId(entityType: EntityType, directId: number): SyncRow | null;

  /** Строка по локальному id (для разрешения конфликтов). */
  getByLocalId(entityType: EntityType, localId: LocalId): SyncRow | null;

  /** Вставить пришедший с сервера объект как `synced`. */
  insertSynced(row: NewSyncedRow): void;

  /** Обновить строку данными сервера, обновить `server_hash`, пометить `synced`. */
  applyServer(
    entityType: EntityType,
    localId: LocalId,
    fields: Record<string, unknown>,
    serverHash: string,
    syncedAt: number,
  ): void;

  /** Пометить строку конфликтной (правки пользователя НЕ затираются). */
  markConflict(entityType: EntityType, localId: LocalId): void;

  /**
   * Оставить локальные правки, но принять новый `server_hash` как базовый
   * (после разрешения конфликта в пользу локального). Статус → `modified`.
   */
  rebaseLocal(
    entityType: EntityType,
    localId: LocalId,
    serverHash: string,
    fields?: Record<string, unknown>,
  ): void;

  /**
   * Успешный push: проставить `direct_id` (для `new`), обновить `server_hash`,
   * пометить `synced`.
   */
  markSynced(
    entityType: EntityType,
    localId: LocalId,
    directId: number,
    serverHash: string,
    syncedAt: number,
  ): void;

  /** Перевесить `parent_direct_id` у детей после появления id родителя. */
  setParentDirectId(childType: EntityType, parentLocalId: LocalId, parentDirectId: number): void;

  /** Физически удалить строку после успешного удаления на сервере. */
  hardDelete(entityType: EntityType, localId: LocalId): void;
}

/** Хранилище `last_sync_timestamp` per-аккаунт/скоуп. */
export interface SyncStateRepository {
  /** `scope`: `'changes'` для changes/check, `'dict'` для checkDict. */
  getTimestamp(account: string, scope: string): string | null;
  setTimestamp(account: string, scope: string, timestamp: string): void;
}

/** Очередь и репозиторий конфликтов. */
export interface ConflictRepository {
  enqueue(conflict: Conflict): void;
  list(account?: string): Conflict[];
  get(id: string): Conflict | null;
  remove(id: string): void;
}

/** Журнал операций синхронизации (для отладки). */
export interface OperationLogRepository {
  append(entry: OperationLogEntry): void;
}

/**
 * Порт клиента Yandex Direct API v5. Реализация в `src/direct-api` разбирает
 * `Units`, ретраит сетевые/`error_code 56`, делает авто-пагинацию в `get`.
 */
export interface DirectApiPort {
  /** Баллы после последнего запроса (`null` до первого вызова). */
  readonly units: UnitsInfo | null;

  /** `changes/checkDict` — менялись ли справочники. */
  checkDict(account: string, timestamp: string | null): Promise<CheckDictResult>;

  /** `changes/check` — что изменилось с момента `timestamp`. */
  check(account: string, entityTypes: EntityType[], timestamp: string | null): Promise<ChangesResult>;

  /**
   * `get` с авто-пагинацией. `ids` — точечно (после changes) либо `undefined`
   * для полной первичной выгрузки.
   */
  get(account: string, entityType: EntityType, ids?: number[]): Promise<ServerObject[]>;

  add(account: string, entityType: EntityType, objects: ServerObject[]): Promise<BulkResult>;
  update(account: string, entityType: EntityType, objects: ServerObject[]): Promise<BulkResult>;
  delete(account: string, entityType: EntityType, ids: number[]): Promise<BulkResult>;
}

/** Часы — вынесены в порт, чтобы тесты были детерминированы. */
export interface Clock {
  now(): number;
}

/** Пауза (бэкофф). Инъекция позволяет тестам не ждать реально. */
export type Sleep = (ms: number) => Promise<void>;
