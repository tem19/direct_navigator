/** Публичный API движка синхронизации. */
export { SyncEngine } from './engine';
export type { SyncEngineDeps } from './engine';
export { resolveConflict } from './conflicts';
export { serverHash, diffFields } from './hash';
export { InsufficientUnitsError, RateLimitError, SyncError } from './errors';
export { BATCH_LIMIT, UNIT_COST, ERROR_RATE_LIMIT, ERROR_NO_UNITS } from './limits';
export { ProgressEmitter } from './progress';
export type { ProgressListener } from './progress';
export type {
  ConflictRepository,
  DirectApiPort,
  EntityRepository,
  NewSyncedRow,
  OperationLogRepository,
  SyncStateRepository,
  Clock,
  Sleep,
} from './ports';
export * from './types';
