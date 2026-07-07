import type { EntityType } from './types';

/** Базовая ошибка синхронизации. */
export class SyncError extends Error {}

/**
 * Недостаточно баллов для запланированного push. Кидается ДО отправки
 * запросов (пред-оценка) либо при `error_code 152` от сервера.
 */
export class InsufficientUnitsError extends SyncError {
  constructor(
    readonly required: number,
    readonly remaining: number,
  ) {
    super(
      `Недостаточно баллов (units) для синхронизации: нужно ~${required}, доступно ${remaining}. ` +
        `Push остановлен, чтобы не сыпать запросами.`,
    );
    this.name = 'InsufficientUnitsError';
  }
}

/**
 * Превышен лимит запросов (`error_code 56`). Транспорт уже ретраит с бэкоффом;
 * если исчерпал попытки — движок логирует и продолжает со следующей пачкой.
 */
export class RateLimitError extends SyncError {
  constructor(
    readonly entityType?: EntityType,
    readonly retryAfterMs?: number,
  ) {
    super(`Превышен лимит запросов Direct API (error_code 56)`);
    this.name = 'RateLimitError';
  }
}
