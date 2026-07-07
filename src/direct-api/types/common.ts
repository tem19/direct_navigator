/**
 * Общие типы Yandex Direct API v5 (JSON).
 *
 * Тело запроса ко всем сервисам имеет вид `{ method, params }`.
 * Ответ приходит в `{ result }` либо `{ error }`, плюс заголовок `Units`.
 */

/** Язык сообщений/ошибок API (заголовок `Accept-Language`). */
export type ApiLanguage = 'ru' | 'en';

/** Пагинация в `get`-запросах. */
export interface Page {
  Limit: number;
  Offset: number;
}

/**
 * Тело запроса к сервису Direct API.
 * `TParams` — параметры конкретного метода (`GetRequest`, `AddRequest`, ...).
 */
export interface ApiRequest<TParams> {
  method: string;
  params: TParams;
}

/**
 * Ошибка уровня всего запроса (HTTP 200, но `{ error }` в теле).
 * Приходит, например, при неверном токене или битом запросе.
 */
export interface ApiTopLevelError {
  error_code: number;
  error_string: string;
  error_detail: string;
  request_id?: string;
}

/** «Сырой» ответ сервиса: либо `result`, либо `error`. */
export interface ApiEnvelope<TResult> {
  result?: TResult;
  error?: ApiTopLevelError;
}

/**
 * Поэлементная ошибка/предупреждение внутри `add/update/delete`-ответа.
 * У каждого элемента запроса — свой массив `Errors` и/или `Warnings`.
 */
export interface ApiExceptionNotification {
  Code: number;
  Message: string;
  Details?: string;
}

/** Результат операции над одним элементом (add/update/delete/...). */
export interface ActionResult {
  Id?: number;
  Errors?: ApiExceptionNotification[];
  Warnings?: ApiExceptionNotification[];
}

/**
 * Часть `result`, общая для всех `get`-ответов: курсор пагинации.
 * `LimitedBy` — Offset, с которого читать следующую страницу; если его нет —
 * страница последняя.
 */
export interface GetResultPage {
  LimitedBy?: number;
}

/** Баллы (units) из заголовка `Units: потрачено/остаток/суточный-лимит`. */
export interface UnitsInfo {
  /** Списано баллов на этот запрос. */
  spent: number;
  /** Остаток доступных баллов. */
  rest: number;
  /** Суточный лимит. */
  limit: number;
}
