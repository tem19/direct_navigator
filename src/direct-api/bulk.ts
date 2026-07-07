import type { ActionResult, ApiExceptionNotification } from './types/common';

/** Нормализованная причина ошибки/предупреждения по одному элементу. */
export interface BulkReason {
  code: number;
  message: string;
  details?: string;
}

/** Успешно обработанный элемент (мог прийти с предупреждениями). */
export interface BulkSuccess<T> {
  /** Индекс элемента в исходном запросе (для сопоставления с входными данными). */
  index: number;
  /** Присвоенный/затронутый Id (для add — новый Id объекта). */
  id?: number;
  /** Исходный элемент запроса, если вызывающий код его передал. */
  input?: T;
  warnings: BulkReason[];
}

/** Элемент, который не удалось обработать. */
export interface BulkFailure<T> {
  index: number;
  input?: T;
  errors: BulkReason[];
  warnings: BulkReason[];
}

/**
 * Разобранный поэлементный результат `add/update/delete/...`.
 *
 * HTTP 200 НЕ означает успех: часть элементов могла завершиться `Errors`.
 * Этот тип разносит их на `succeeded`/`failed` с сохранением индекса.
 */
export interface BulkResult<T> {
  succeeded: BulkSuccess<T>[];
  failed: BulkFailure<T>[];
  /** true, если хотя бы один элемент завершился с ошибкой. */
  readonly hasErrors: boolean;
  /** true, если хотя бы у одного элемента (успешного или нет) есть warning. */
  readonly hasWarnings: boolean;
}

function toReason(n: ApiExceptionNotification): BulkReason {
  return { code: n.Code, message: n.Message, details: n.Details };
}

/**
 * Разбирает массив поэлементных результатов Direct API в `BulkResult`.
 *
 * @param results  Массив из ответа (`AddResults` / `UpdateResults` / `DeleteResults` / ...).
 * @param inputs   Необязательно — исходные элементы запроса в том же порядке,
 *                 чтобы приложить их к результату для удобства вызывающего кода.
 */
export function parseBulkResult<T = unknown>(
  results: ActionResult[],
  inputs?: readonly T[],
): BulkResult<T> {
  const succeeded: BulkSuccess<T>[] = [];
  const failed: BulkFailure<T>[] = [];

  results.forEach((res, index) => {
    const warnings = (res.Warnings ?? []).map(toReason);
    const errors = (res.Errors ?? []).map(toReason);
    const input = inputs?.[index];

    if (errors.length > 0) {
      failed.push({ index, input, errors, warnings });
    } else {
      succeeded.push({ index, id: res.Id, input, warnings });
    }
  });

  return {
    succeeded,
    failed,
    get hasErrors() {
      return this.failed.length > 0;
    },
    get hasWarnings() {
      return (
        this.succeeded.some((s: BulkSuccess<T>) => s.warnings.length > 0) ||
        this.failed.some((f: BulkFailure<T>) => f.warnings.length > 0)
      );
    },
  };
}
