import {
  DirectApiError,
  parseUnits,
  RATE_LIMIT_ERROR_CODE,
  type Units,
} from './types/common';

export interface DirectClientOptions {
  /** Базовый URL, напр. https://api-sandbox.direct.yandex.com/json/v5/ */
  baseUrl: string;
  /** Функция получения OAuth-токена (из main/safeStorage). Сырой токен не логируем. */
  getToken: () => Promise<string> | string;
  clientLogin?: string;
  acceptLanguage?: 'ru' | 'en';
  /** Колбэк с остатком баллов после каждого ответа. */
  onUnits?: (units: Units) => void;
  /** Максимум повторов на сетевые/5xx/rate-limit ошибки. */
  maxRetries?: number;
  /** fetch-совместимая функция (для тестов — мок). */
  fetchFn?: typeof fetch;
}

interface ApiEnvelope<R> {
  result?: R;
  error?: { error_code: number; error_string: string; error_detail?: string };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class DirectClient {
  private readonly maxRetries: number;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly opts: DirectClientOptions) {
    this.maxRetries = opts.maxRetries ?? 4;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  /**
   * Один вызов метода сервиса. Разбирает ошибку верхнего уровня и units,
   * делает экспоненциальный бэкофф на сеть/5xx/error_code 56.
   */
  async call<R>(service: string, method: string, params: unknown): Promise<R> {
    const url = new URL(service, this.ensureSlash(this.opts.baseUrl)).toString();
    const token = await this.opts.getToken();

    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt++;
      let res: Response;
      try {
        res = await this.fetchFn(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
            'Accept-Language': this.opts.acceptLanguage ?? 'ru',
            ...(this.opts.clientLogin ? { 'Client-Login': this.opts.clientLogin } : {}),
          },
          body: JSON.stringify({ method, params }),
        });
      } catch (netErr) {
        if (attempt <= this.maxRetries) {
          await sleep(this.backoff(attempt));
          continue;
        }
        throw netErr;
      }

      const units = parseUnits(res.headers.get('Units'));
      if (units) this.opts.onUnits?.(units);

      if (res.status >= 500 && attempt <= this.maxRetries) {
        await sleep(this.backoff(attempt));
        continue;
      }

      const body = (await res.json()) as ApiEnvelope<R>;

      if (body.error) {
        const { error_code, error_string, error_detail } = body.error;
        if (error_code === RATE_LIMIT_ERROR_CODE && attempt <= this.maxRetries) {
          await sleep(this.backoff(attempt));
          continue;
        }
        throw new DirectApiError(error_code, error_string, error_detail);
      }

      if (body.result === undefined) {
        throw new DirectApiError(-1, 'Пустой result в ответе API');
      }
      return body.result;
    }
  }

  /**
   * Авто-пагинация get: дочитывает все страницы через LimitedBy.
   * @param extract функция, достающая массив из result по имени коллекции.
   */
  async getAll<Item, R extends { LimitedBy?: number }>(
    service: string,
    params: Record<string, unknown>,
    extract: (result: R) => Item[] | undefined,
    pageLimit = 10000,
  ): Promise<Item[]> {
    const all: Item[] = [];
    let offset = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = {
        ...params,
        Page: { Limit: pageLimit, Offset: offset },
      };
      const result = await this.call<R>(service, 'get', page);
      const items = extract(result) ?? [];
      all.push(...items);
      if (result.LimitedBy && items.length > 0) {
        offset = result.LimitedBy;
      } else {
        break;
      }
    }
    return all;
  }

  private backoff(attempt: number): number {
    // 2s, 4s, 8s, 16s ...
    return Math.min(2000 * 2 ** (attempt - 1), 30000);
  }

  private ensureSlash(u: string): string {
    return u.endsWith('/') ? u : `${u}/`;
  }
}
