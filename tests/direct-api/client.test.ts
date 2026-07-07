import { describe, it, expect, vi } from 'vitest';
import { DirectClient } from '../../src/direct-api/client';
import { DirectApiError } from '../../src/direct-api/types/common';

function jsonResponse(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('DirectClient', () => {
  it('шлёт Bearer-токен и Client-Login, парсит units', async () => {
    const onUnits = vi.fn();
    const fetchFn = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse({ result: { Campaigns: [] } }, { Units: '3/4997/5000' }),
    );

    const client = new DirectClient({
      baseUrl: 'https://api-sandbox.direct.yandex.com/json/v5/',
      getToken: () => 'TOK',
      clientLogin: 'advertiser',
      onUnits,
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await client.call('campaigns', 'get', { SelectionCriteria: {} });

    const [, init] = fetchFn.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer TOK');
    expect(headers['Client-Login']).toBe('advertiser');
    expect(onUnits).toHaveBeenCalledWith({ spent: 3, balance: 4997, dailyLimit: 5000 });
  });

  it('бросает DirectApiError на ошибку верхнего уровня', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ error: { error_code: 8000, error_string: 'Ошибка запроса' } }),
    );
    const client = new DirectClient({
      baseUrl: 'https://api-sandbox.direct.yandex.com/json/v5/',
      getToken: () => 'TOK',
      maxRetries: 0,
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await expect(client.call('campaigns', 'get', {})).rejects.toBeInstanceOf(
      DirectApiError,
    );
  });

  it('дочитывает страницы через LimitedBy', async () => {
    const pages = [
      { result: { Campaigns: [{ Id: 1 }, { Id: 2 }], LimitedBy: 2 } },
      { result: { Campaigns: [{ Id: 3 }] } },
    ];
    let call = 0;
    const fetchFn = vi.fn(async () => jsonResponse(pages[call++]));

    const client = new DirectClient({
      baseUrl: 'https://api-sandbox.direct.yandex.com/json/v5/',
      getToken: () => 'TOK',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    const all = await client.getAll<{ Id: number }, { Campaigns?: { Id: number }[]; LimitedBy?: number }>(
      'campaigns',
      { SelectionCriteria: {}, FieldNames: ['Id'] },
      (r) => r.Campaigns,
      2,
    );

    expect(all.map((c) => c.Id)).toEqual([1, 2, 3]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
