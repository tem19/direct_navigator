/**
 * Публичные типы движка синхронизации.
 *
 * Слой `sync/` не знает про Electron и SQL — он оперирует нормализованными
 * структурами и общается с БД/API через порты (см. `ports.ts`).
 */

/** Локальный идентификатор строки (автоинкремент или uuid). */
export type LocalId = string | number;

/** Статус синхронизации строки (совпадает с моделью в `/data-model`). */
export type SyncStatus = 'synced' | 'new' | 'modified' | 'deleted' | 'conflict';

/**
 * Тип сущности Директа. Порядок в `ENTITY_ORDER` задаёт порядок push
 * (родители раньше детей).
 */
export type EntityType = 'campaign' | 'adgroup' | 'ad' | 'keyword';

/** Порядок обработки при push: кампания → группа → объявление/ключевое слово. */
export const ENTITY_ORDER: readonly EntityType[] = ['campaign', 'adgroup', 'ad', 'keyword'];

/** Для каждой сущности — её родитель (для перевешивания `direct_id` детей). */
export const PARENT_OF: Readonly<Record<EntityType, EntityType | null>> = {
  campaign: null,
  adgroup: 'campaign',
  ad: 'adgroup',
  keyword: 'adgroup',
};

/**
 * Нормализованная строка для синхронизации. Репозиторий отдаёт домен-поля в
 * `fields`; движок не интерпретирует их содержимое, только считает `server_hash`
 * и сравнивает.
 */
export interface SyncRow {
  localId: LocalId;
  entityType: EntityType;
  /** ID в Директе; `null` пока сущность не выгружена (`new`). */
  directId: number | null;
  /** Локальный id родителя (для `new`-детей, чей родитель тоже создаётся). */
  parentLocalId: LocalId | null;
  /** `direct_id` родителя, если уже известен. */
  parentDirectId: number | null;
  syncStatus: SyncStatus;
  /** Снимок серверных полей (хэш) для детекта конфликтов. */
  serverHash: string | null;
  /** Доменные поля сущности (то, что уйдёт в API). */
  fields: Record<string, unknown>;
  updatedAtLocal: number;
  syncedAt: number | null;
}

/** Серверный объект после нормализации клиентом API. */
export interface ServerObject {
  entityType: EntityType;
  id: number;
  parentDirectId: number | null;
  fields: Record<string, unknown>;
}

/** Информация о баллах из заголовка `Units` ответа API. */
export interface UnitsInfo {
  /** Списано текущим запросом. */
  spent: number;
  /** Остаток на счётчике. */
  remaining: number;
  /** Суточный лимит. */
  dailyLimit: number;
}

/** Ошибка одного элемента при частичном успехе. */
export interface DirectError {
  code: number;
  message: string;
  detail?: string;
}

/** Результат одного элемента bulk-операции (индекс совпадает со входом). */
export interface BulkItemResult {
  /** Присвоенный `direct_id` при успешном `add`. */
  id?: number;
  errors?: DirectError[];
  warnings?: DirectError[];
}

/** Разобранный поэлементный результат bulk-операции + баллы. */
export interface BulkResult {
  results: BulkItemResult[];
  units: UnitsInfo;
}

/** Ответ `changes/check`: что изменилось с момента `Timestamp`. */
export interface ChangesResult {
  /** Новый timestamp — сохранить для следующего инкрементального pull. */
  timestamp: string;
  /** Ничего не поменялось (повторный pull не должен делать `get`). */
  notModified: boolean;
  /** `direct_id`, изменённые с прошлой синхры, по типам. */
  modified: Partial<Record<EntityType, number[]>>;
  /** `direct_id`, удалённые на сервере, по типам. */
  deleted: Partial<Record<EntityType, number[]>>;
}

/** Ответ `changes/checkDict`: менялись ли справочники. */
export interface CheckDictResult {
  timestamp: string;
  /** `true`, если справочники изменились и их стоит перечитать. */
  changed: boolean;
}

/** Расхождение по одному полю при конфликте. */
export interface FieldDiff {
  field: string;
  local: unknown;
  server: unknown;
}

/** Конфликт: локальная версия + серверная + список расхождений. */
export interface Conflict {
  id: string;
  account: string;
  entityType: EntityType;
  localId: LocalId;
  directId: number;
  local: Record<string, unknown>;
  server: Record<string, unknown>;
  /** Хэш серверной версии на момент детекта. */
  serverHash: string;
  diffs: FieldDiff[];
  detectedAt: number;
}

/**
 * Разрешение конфликта:
 * - `keepLocal` — оставить локальную правку, перезаписать сервер при push;
 * - `takeServer` — принять серверную версию, пометить `synced`;
 * - `{ perField }` — по полям.
 */
export type ConflictResolution =
  | 'keepLocal'
  | 'takeServer'
  | { perField: Record<string, 'local' | 'server'> };

/** Запись журнала операций синхронизации. */
export interface OperationLogEntry {
  at: number;
  account: string;
  phase: 'pull' | 'push';
  op: 'get' | 'add' | 'update' | 'delete' | 'changes' | 'conflict';
  entityType?: EntityType;
  localId?: LocalId;
  directId?: number;
  outcome: 'ok' | 'error' | 'warning' | 'skipped';
  message?: string;
  unitsSpent?: number;
}

/** Событие прогресса для UI (стрим). */
export type SyncProgressEvent =
  | { type: 'phase'; phase: 'pull' | 'push'; status: 'start' | 'done' }
  | {
      type: 'entity';
      entityType: EntityType;
      op: 'pull' | 'add' | 'update' | 'delete';
      processed: number;
      total: number;
    }
  | { type: 'units'; units: UnitsInfo }
  | { type: 'conflict'; conflict: Conflict }
  | { type: 'error'; entityType?: EntityType; localId?: LocalId; directId?: number; message: string }
  | { type: 'log'; message: string };

/** Итог одной фазы/полной синхры для возврата вызывающему коду. */
export interface SyncReport {
  phase: 'pull' | 'push' | 'full';
  pulled: number;
  pushed: number;
  failed: number;
  conflicts: number;
  unitsSpent: number;
  errors: Array<{ entityType?: EntityType; localId?: LocalId; message: string }>;
}
