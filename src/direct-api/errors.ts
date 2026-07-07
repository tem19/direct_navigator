import type { ApiTopLevelError, UnitsInfo } from './types/common';

/**
 * Известные коды ошибок Direct API, которые обрабатываются специально.
 * Полный список — в документации, здесь только те, на которые завязана логика.
 */
export const DirectErrorCode = {
  /** Превышен лимит запросов в секунду → нужен бэкофф и повтор. */
  RATE_LIMIT: 56,
  /** Недостаточно баллов (units) для выполнения запроса. */
  NOT_ENOUGH_UNITS: 152,
} as const;

/** Ошибка уровня запроса (тело `{ error }`). */
export class DirectApiError extends Error {
  readonly code: number;
  readonly detail: string;
  readonly requestId?: string;
  /** Баллы на момент ошибки, если заголовок `Units` пришёл. */
  readonly units: UnitsInfo | null;

  constructor(error: ApiTopLevelError, units: UnitsInfo | null = null) {
    super(`Direct API error ${error.error_code}: ${error.error_string}`);
    this.name = 'DirectApiError';
    this.code = error.error_code;
    this.detail = error.error_detail;
    this.requestId = error.request_id;
    this.units = units;
  }

  /** Превышен лимит запросов (rate limit) — имеет смысл повторить с бэкоффом. */
  get isRateLimited(): boolean {
    return this.code === DirectErrorCode.RATE_LIMIT;
  }

  /** Кончились баллы — повтор бессмысленен, нужно сообщить наверх. */
  get isOutOfUnits(): boolean {
    return this.code === DirectErrorCode.NOT_ENOUGH_UNITS;
  }
}

/** Ошибка транспорта: сеть, таймаут, не-200 HTTP без разбираемого тела. */
export class DirectTransportError extends Error {
  readonly status?: number;
  readonly cause?: unknown;

  constructor(message: string, options: { status?: number; cause?: unknown } = {}) {
    super(message);
    this.name = 'DirectTransportError';
    this.status = options.status;
    this.cause = options.cause;
  }

  /** 5xx — временная проблема на стороне сервера, можно повторить. */
  get isRetriableStatus(): boolean {
    return this.status !== undefined && this.status >= 500 && this.status < 600;
  }
}
