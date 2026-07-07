import type { ApiLanguage } from './types/common';

/** Боевой и песочный базовые URL Direct API v5. */
export const DIRECT_BASE_URL = {
  production: 'https://api.direct.yandex.com/json/v5/',
  sandbox: 'https://api-sandbox.direct.yandex.com/json/v5/',
} as const;

/**
 * Провайдер OAuth-токена. Токен НЕ хранится в `.env`/файлах: в main-процессе он
 * расшифровывается через `safeStorage` (Keychain) и отдаётся сюда по требованию.
 * Может быть асинхронным.
 */
export type TokenProvider = () => string | Promise<string>;

export interface DirectClientConfig {
  /** Базовый URL сервиса (со слэшем на конце). По умолчанию — sandbox. */
  baseUrl: string;
  /** Функция получения актуального OAuth-токена. */
  getToken: TokenProvider;
  /** Логин клиента для агентских аккаунтов (`Client-Login`). */
  clientLogin?: string;
  /** Язык сообщений API (`Accept-Language`). По умолчанию `ru`. */
  language: ApiLanguage;
  /** Списывать баллы оператора (`Use-Operator-Units: true`). */
  useOperatorUnits: boolean;
  /** Максимум повторов на ретраибельные ошибки. По умолчанию 5. */
  maxRetries: number;
  /** Базовая задержка бэкоффа, мс. По умолчанию 1000. */
  backoffBaseMs: number;
  /** Таймаут одного HTTP-запроса, мс. По умолчанию 60000. */
  timeoutMs: number;
  /** Подмена `fetch` (для тестов). По умолчанию глобальный `fetch`. */
  fetchImpl?: typeof fetch;
}

export type DirectClientOptions = Partial<Omit<DirectClientConfig, 'getToken' | 'baseUrl'>> & {
  getToken: TokenProvider;
  /** Явный базовый URL. Если не задан — берётся из env (`resolveBaseUrl`). */
  baseUrl?: string;
};

/**
 * Определяет базовый URL из окружения.
 * `DIRECT_API_BASE_URL` — явный override; иначе `DIRECT_API_ENV` (`production`
 * переключает на бой), по умолчанию — sandbox (безопасно для разработки).
 */
export function resolveBaseUrl(env: Record<string, string | undefined> = process.env): string {
  if (env.DIRECT_API_BASE_URL) return env.DIRECT_API_BASE_URL;
  return env.DIRECT_API_ENV === 'production'
    ? DIRECT_BASE_URL.production
    : DIRECT_BASE_URL.sandbox;
}

/** Собирает полную конфигурацию из опций и env, подставляя дефолты. */
export function resolveConfig(
  options: DirectClientOptions,
  env: Record<string, string | undefined> = process.env,
): DirectClientConfig {
  return {
    baseUrl: options.baseUrl ?? resolveBaseUrl(env),
    getToken: options.getToken,
    clientLogin: options.clientLogin ?? env.DIRECT_API_CLIENT_LOGIN,
    language: options.language ?? (env.DIRECT_API_LANGUAGE as ApiLanguage) ?? 'ru',
    useOperatorUnits: options.useOperatorUnits ?? false,
    maxRetries: options.maxRetries ?? 5,
    backoffBaseMs: options.backoffBaseMs ?? 1000,
    timeoutMs: options.timeoutMs ?? 60_000,
    fetchImpl: options.fetchImpl,
  };
}
