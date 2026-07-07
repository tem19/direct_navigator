import { resolveConfig, type DirectClientConfig, type DirectClientOptions } from './config';
import { DirectApiError, DirectTransportError } from './errors';
import { parseUnitsHeader } from './units';
import type { ApiEnvelope, GetResultPage, Page, UnitsInfo } from './types/common';

/** Результат одного запроса: разобранный `result` + баллы из заголовка. */
export interface ApiCallResult<TResult> {
  result: TResult;
  units: UnitsInfo | null;
}

/** Колбэк, вызываемый после каждого ответа с актуальным остатком баллов. */
export type UnitsListener = (units: UnitsInfo) => void;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Транспорт Yandex Direct API v5.
 *
 * Отвечает за заголовки, авторизацию, ретраи с экспоненциальным бэкоффом,
 * таймауты, учёт баллов (`Units`) и авто-пагинацию `get`-запросов. Сервисные
 * обёртки (`CampaignsService` и т.п.) строятся поверх `request`/`getAll`.
 */
export class DirectApiClient {
  private readonly config: DirectClientConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly unitsListeners = new Set<UnitsListener>();
  /** Последние известные баллы (после любого ответа). */
  lastUnits: UnitsInfo | null = null;

  constructor(options: DirectClientOptions) {
    this.config = resolveConfig(options);
    this.fetchImpl = this.config.fetchImpl ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error('Global fetch недоступен — передайте fetchImpl в конфиг клиента.');
    }
  }

  /** Подписка на обновления баллов. Возвращает функцию отписки. */
  onUnits(listener: UnitsListener): () => void {
    this.unitsListeners.add(listener);
    return () => this.unitsListeners.delete(listener);
  }

  /**
   * Выполняет один вызов метода сервиса.
   *
   * @param service  URL-сегмент сервиса (`campaigns`, `adgroups`, ...).
   * @param method   Метод (`get`, `add`, `update`, `delete`, статусные).
   * @param params   Параметры метода.
   */
  async request<TResult, TParams = unknown>(
    service: string,
    method: string,
    params: TParams,
  ): Promise<ApiCallResult<TResult>> {
    const url = this.config.baseUrl + service;
    const body = JSON.stringify({ method, params });

    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt += 1;
      try {
        return await this.attempt<TResult>(url, body);
      } catch (err) {
        if (attempt > this.config.maxRetries || !this.isRetriable(err)) {
          throw err;
        }
        await sleep(this.backoffDelay(attempt, err));
      }
    }
  }

  /** Один сетевой запрос без ретраев. */
  private async attempt<TResult>(url: string, body: string): Promise<ApiCallResult<TResult>> {
    const token = await this.config.getToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'POST',
        headers: this.buildHeaders(token),
        body,
        signal: controller.signal,
      });
    } catch (cause) {
      // Сетевой сбой или таймаут (abort) — считаем ретраибельным.
      throw new DirectTransportError('Сетевой сбой при запросе к Direct API', { cause });
    } finally {
      clearTimeout(timer);
    }

    const units = parseUnitsHeader(response.headers.get('Units'));
    if (units) this.emitUnits(units);

    if (response.status >= 500) {
      throw new DirectTransportError(`Direct API вернул ${response.status}`, {
        status: response.status,
      });
    }

    // 4xx с валидным JSON-телом разбираем как ошибку API, а не транспорта.
    const envelope = (await response.json().catch(() => null)) as ApiEnvelope<TResult> | null;
    if (!envelope) {
      throw new DirectTransportError(`Не удалось разобрать ответ Direct API (${response.status})`, {
        status: response.status,
      });
    }

    if (envelope.error) {
      throw new DirectApiError(envelope.error, units);
    }
    if (envelope.result === undefined) {
      throw new DirectTransportError('Ответ Direct API без result и без error', {
        status: response.status,
      });
    }

    return { result: envelope.result, units };
  }

  private buildHeaders(token: string): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      'Accept-Language': this.config.language,
    };
    if (this.config.clientLogin) headers['Client-Login'] = this.config.clientLogin;
    if (this.config.useOperatorUnits) headers['Use-Operator-Units'] = 'true';
    return headers;
  }

  private emitUnits(units: UnitsInfo): void {
    this.lastUnits = units;
    for (const l of this.unitsListeners) l(units);
  }

  private isRetriable(err: unknown): boolean {
    if (err instanceof DirectApiError) return err.isRateLimited; // error_code 56
    if (err instanceof DirectTransportError) {
      return err.status === undefined || err.isRetriableStatus; // сеть/таймаут или 5xx
    }
    return false;
  }

  /** Экспоненциальный бэкофф с джиттером; для rate limit — чуть агрессивнее. */
  private backoffDelay(attempt: number, err: unknown): number {
    const base = this.config.backoffBaseMs;
    const exp = base * 2 ** (attempt - 1);
    const jitter = Math.random() * base;
    const capped = Math.min(exp + jitter, 30_000);
    if (err instanceof DirectApiError && err.isRateLimited) {
      return Math.max(capped, base * attempt);
    }
    return capped;
  }

  /**
   * Авто-пагинация `get`-запроса: дочитывает все страницы, склеивая массивы,
   * извлечённые селектором `pick`. Двигает `Page.Offset` по `LimitedBy`.
   *
   * @param service  URL-сегмент сервиса.
   * @param params   Параметры `get` (SelectionCriteria, FieldNames, ...). Поле
   *                 `Page` подставляется/переопределяется автоматически.
   * @param pick     Достаёт массив элементов из `result` (напр. `r => r.Campaigns`).
   * @param pageSize Размер страницы (Limit). По умолчанию 10000 — максимум API.
   */
  async getAll<TResult extends GetResultPage, TItem>(
    service: string,
    params: Record<string, unknown>,
    pick: (result: TResult) => TItem[] | undefined,
    pageSize = 10_000,
  ): Promise<{ items: TItem[]; units: UnitsInfo | null }> {
    const items: TItem[] = [];
    let offset = 0;
    let lastUnits: UnitsInfo | null = null;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page: Page = { Limit: pageSize, Offset: offset };
      const { result, units } = await this.request<TResult>(service, 'get', {
        ...params,
        Page: page,
      });
      lastUnits = units;
      items.push(...(pick(result) ?? []));

      if (result.LimitedBy === undefined) break;
      offset = result.LimitedBy;
    }

    return { items, units: lastUnits };
  }
}
