/**
 * Тонкий клиент Yandex Direct API v5.
 *
 * Каркас: один сервис = один URL, методы add/update/delete/get + статусные.
 * Здесь заложены авторизация, разбор баллов (units) и базовый разбор ошибок.
 * Реальные методы сервисов добавляются командой /direct-api.
 */

export interface DirectApiConfig {
  /** Базовый URL, напр. https://api-sandbox.direct.yandex.com/json/v5/ */
  baseUrl: string
  /** OAuth-токен (получается из main из зашифрованного хранилища). */
  token: string
  /** Client-Login — логин рекламодателя для агентского доступа. */
  clientLogin?: string
  /** Язык сообщений об ошибках. */
  acceptLanguage?: string
}

/** Информация о баллах (units) из заголовка ответа Units. */
export interface UnitsInfo {
  spent: number
  rest: number
  limit: number
}

export interface DirectApiResult<T> {
  result: T
  units: UnitsInfo | null
}

export class DirectApiError extends Error {
  constructor(
    readonly errorCode: number,
    message: string,
    readonly errorDetail?: string,
    readonly requestId?: string
  ) {
    super(message)
    this.name = 'DirectApiError'
  }

  /** error_code 56 — превышен лимит запросов, требуется бэкофф. */
  get isRateLimit(): boolean {
    return this.errorCode === 56
  }
}

function parseUnits(header: string | null): UnitsInfo | null {
  if (!header) return null
  // Формат: "spent/rest/limit", напр. "10/4990/5000"
  const [spent, rest, limit] = header.split('/').map((n) => Number.parseInt(n, 10))
  if ([spent, rest, limit].some((n) => Number.isNaN(n))) return null
  return { spent, rest, limit }
}

export class DirectApiClient {
  constructor(private readonly config: DirectApiConfig) {}

  /**
   * Низкоуровневый вызов метода сервиса Директа.
   * @param service имя сервиса (кусок URL), напр. "campaigns"
   * @param method  "get" | "add" | "update" | "delete" | ...
   * @param params  тело запроса (поле params в JSON API v5)
   */
  async call<TParams, TResult>(
    service: string,
    method: string,
    params: TParams
  ): Promise<DirectApiResult<TResult>> {
    const url = new URL(service, this.config.baseUrl).toString()
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.token}`,
      'Accept-Language': this.config.acceptLanguage ?? 'ru',
      'Content-Type': 'application/json; charset=utf-8'
    }
    if (this.config.clientLogin) headers['Client-Login'] = this.config.clientLogin

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ method, params })
    })

    const units = parseUnits(response.headers.get('Units'))
    const body = (await response.json()) as {
      result?: TResult
      error?: { error_code: number; error_string: string; error_detail?: string; request_id?: string }
    }

    if (body.error) {
      throw new DirectApiError(
        body.error.error_code,
        body.error.error_string,
        body.error.error_detail,
        body.error.request_id
      )
    }

    return { result: body.result as TResult, units }
  }
}
