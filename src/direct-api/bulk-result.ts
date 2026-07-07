import type { ApiIssue } from './types/common';

/** Результат по одному элементу пачечной операции add/update/delete. */
export interface ItemResult<T> {
  /** Исходный элемент (или его индекс-идентификатор). */
  input: T;
  /** ID, присвоенный сервером при успехе (для add). */
  id?: number;
  errors: ApiIssue[];
  warnings: ApiIssue[];
}

/**
 * Разобранный поэлементный результат. Никогда не считаем весь запрос успешным
 * по HTTP 200 — раскладываем на succeeded / failed / warnings.
 */
export class BulkResult<T> {
  readonly succeeded: ItemResult<T>[] = [];
  readonly failed: ItemResult<T>[] = [];
  readonly warnings: ItemResult<T>[] = [];

  add(item: ItemResult<T>): void {
    if (item.errors.length > 0) {
      this.failed.push(item);
    } else {
      this.succeeded.push(item);
      if (item.warnings.length > 0) this.warnings.push(item);
    }
  }

  get hasFailures(): boolean {
    return this.failed.length > 0;
  }

  get allSucceeded(): boolean {
    return this.failed.length === 0;
  }
}

/**
 * Собирает BulkResult из массива результатов API. Директ возвращает параллельный
 * массив `AddResults`/`UpdateResults`/`DeleteResults`, где у каждого элемента
 * есть `Id?`, `Errors?`, `Warnings?`.
 */
export function parseBulkResult<T>(
  inputs: T[],
  results: Array<{ Id?: number; Errors?: ApiIssue[]; Warnings?: ApiIssue[] }>,
): BulkResult<T> {
  const out = new BulkResult<T>();
  inputs.forEach((input, i) => {
    const r = results[i] ?? {};
    out.add({
      input,
      id: r.Id,
      errors: r.Errors ?? [],
      warnings: r.Warnings ?? [],
    });
  });
  return out;
}
