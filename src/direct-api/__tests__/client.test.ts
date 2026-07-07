import { describe, expect, it, vi } from 'vitest';
import { DirectApiClient } from '../client';
import { DirectApiError } from '../errors';
import { DIRECT_BASE_URL } from '../config';
import type { CampaignsGetResult } from '../types/campaigns';

/** Строит Response с телом-JSON и заголовком Units. */
function jsonResponse(body: unknown, init: { status?: number; units?: string } = {}): Response {
  const headers = new Headers();
  if (init.units) headers.set('Units', init.units);
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers });
}

function makeClient(fetchImpl: typeof fetch, overrides = {}) {
  return new DirectApiClient({
    baseUrl: DIRECT_BASE_URL.sandbox,
    getToken: async () => 'TEST_TOKEN',
    clientLogin: 'agency-client',
    useOperatorUnits: true,
    backoffBaseMs: 1, // быстрые ретраи в тестах
    fetchImpl,
    ...overrides,
  });
}

describe('DirectApiClient — заголовки и авторизация', () => {
  it('шлёт Bearer-токен, Accept-Language, Client-Login, Use-Operator-Units и правильный URL', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ result: { Campaigns: [] } }));
    const client = makeClient(fetchMock as unknown as typeof fetch);

    await client.request('campaigns', 'get', { FieldNames: ['Id'] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api-sandbox.direct.yandex.com/json/v5/campaigns');
    const headers = opts.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer TEST_TOKEN');
    expect(headers['Accept-Language']).toBe('ru');
    expect(headers['Client-Login']).toBe('agency-client');
    expect(headers['Use-Operator-Units']).toBe('true');
    expect(JSON.parse(opts.body as string)).toEqual({
      method: 'get',
      params: { FieldNames: ['Id'] },
    });
  });
});

describe('DirectApiClient — Units', () => {
  it('парсит заголовок Units и уведомляет подписчиков', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ result: { Campaigns: [] } }, { units: '15/7000/8000' }),
    );
    const client = makeClient(fetchMock as unknown as typeof fetch);

    const listener = vi.fn();
    client.onUnits(listener);

    const { units } = await client.request('campaigns', 'get', {});
    expect(units).toEqual({ spent: 15, rest: 7000, limit: 8000 });
    expect(client.lastUnits).toEqual({ spent: 15, rest: 7000, limit: 8000 });
    expect(listener).toHaveBeenCalledWith({ spent: 15, rest: 7000, limit: 8000 });
  });
});

describe('DirectApiClient — авто-пагинация', () => {
  it('дочитывает все страницы по LimitedBy', async () => {
    const page1: { result: CampaignsGetResult } = {
      result: { Campaigns: [{ Id: 1 }, { Id: 2 }], LimitedBy: 2 },
    };
    const page2: { result: CampaignsGetResult } = {
      result: { Campaigns: [{ Id: 3 }] }, // без LimitedBy → последняя
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(page1, { units: '5/100/200' }))
      .mockResolvedValueOnce(jsonResponse(page2, { units: '5/95/200' }));
    const client = makeClient(fetchMock as unknown as typeof fetch);

    const { items, units } = await client.getAll<CampaignsGetResult, { Id: number }>(
      'campaigns',
      { FieldNames: ['Id'] },
      (r) => r.Campaigns,
      2,
    );

    expect(items.map((c) => c.Id)).toEqual([1, 2, 3]);
    expect(units).toEqual({ spent: 5, rest: 95, limit: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // второй запрос ушёл с Offset = LimitedBy предыдущей страницы
    const secondBody = JSON.parse((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body as string);
    expect(secondBody.params.Page).toEqual({ Limit: 2, Offset: 2 });
  });
});

describe('DirectApiClient — ошибки', () => {
  it('тело { error } → DirectApiError с кодом и деталями', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        error: { error_code: 53, error_string: 'Auth error', error_detail: 'bad token' },
      }),
    );
    const client = makeClient(fetchMock as unknown as typeof fetch);

    await expect(client.request('campaigns', 'get', {})).rejects.toMatchObject({
      name: 'DirectApiError',
      code: 53,
      detail: 'bad token',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1); // не ретраибельно
  });

  it('error_code 152 (нет баллов) не ретраится и помечается isOutOfUnits', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        error: { error_code: 152, error_string: 'No units', error_detail: '' },
      }),
    );
    const client = makeClient(fetchMock as unknown as typeof fetch);

    const err = await client.request('campaigns', 'get', {}).catch((e) => e);
    expect(err).toBeInstanceOf(DirectApiError);
    expect((err as DirectApiError).isOutOfUnits).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('DirectApiClient — ретраи', () => {
  it('повторяет на error_code 56 (rate limit) и в итоге отдаёт результат', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ error: { error_code: 56, error_string: 'Too many', error_detail: '' } }),
      )
      .mockResolvedValueOnce(jsonResponse({ result: { Campaigns: [{ Id: 7 }] } }));
    const client = makeClient(fetchMock as unknown as typeof fetch);

    const { result } = await client.request<CampaignsGetResult>('campaigns', 'get', {});
    expect(result.Campaigns).toEqual([{ Id: 7 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('повторяет на HTTP 500', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ result: { Campaigns: [] } }));
    const client = makeClient(fetchMock as unknown as typeof fetch);

    await client.request('campaigns', 'get', {});
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('повторяет на сетевом сбое, затем сдаётся после maxRetries', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('network down');
    });
    const client = makeClient(fetchMock as unknown as typeof fetch, { maxRetries: 2 });

    await expect(client.request('campaigns', 'get', {})).rejects.toMatchObject({
      name: 'DirectTransportError',
    });
    // 1 попытка + 2 ретрая = 3 вызова
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
