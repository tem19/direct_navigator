/** Общие типы Yandex Direct API v5. */

/** Ошибка/предупреждение по одному элементу или по запросу целиком. */
export interface ApiIssue {
  Code: number;
  Message: string;
  Details?: string;
}

/** Разбор заголовка `Units`: "spent/balance/dailyLimit". */
export interface Units {
  spent: number;
  balance: number;
  dailyLimit: number;
}

export function parseUnits(header: string | null): Units | null {
  if (!header) return null;
  const parts = header.split('/').map((n) => Number(n.trim()));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [spent, balance, dailyLimit] = parts;
  return { spent, balance, dailyLimit };
}

/** Пагинация для get-запросов. */
export interface Page {
  Limit: number;
  Offset: number;
}

export interface LimitedBy {
  LimitedBy: number;
}

/** Ошибка верхнего уровня (весь запрос отклонён). */
export class DirectApiError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = 'DirectApiError';
  }
}

/** Код превышения лимита запросов — повод для бэкоффа. */
export const RATE_LIMIT_ERROR_CODE = 56;
/** Недостаточно баллов. */
export const NOT_ENOUGH_UNITS_ERROR_CODE = 152;
