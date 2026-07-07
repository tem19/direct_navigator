import { describe, expect, it, vi } from 'vitest';
import { DirectApiClient } from '../client';
import { ChangesService } from '../services/changes';
import { KeywordBidsService } from '../services/keywordbids';
import { DictionariesService } from '../services/dictionaries';
import { DIRECT_BASE_URL } from '../config';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { Units: '2/50/100' } });
}

function setup(response: unknown) {
  const fetchMock = vi.fn(async () => jsonResponse(response));
  const client = new DirectApiClient({
    baseUrl: DIRECT_BASE_URL.sandbox,
    getToken: async () => 'T',
    fetchImpl: fetchMock as unknown as typeof fetch,
  });
  return { client, fetchMock };
}

function lastCall(fetchMock: ReturnType<typeof vi.fn>): { url: string; body: any } {
  const [url, opts] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
  return { url, body: JSON.parse(opts.body as string) };
}

describe('ChangesService', () => {
  it('checkCampaigns без since шлёт пустые params', async () => {
    const { client, fetchMock } = setup({
      result: { Campaigns: [{ CampaignId: 1 }], Timestamp: '2026-07-07T00:00:00Z' },
    });
    const svc = new ChangesService(client);

    const { result, units } = await svc.checkCampaigns();

    const { url, body } = lastCall(fetchMock);
    expect(url).toContain('/changes');
    expect(body).toEqual({ method: 'checkCampaigns', params: {} });
    expect(result.Campaigns[0]?.CampaignId).toBe(1);
    expect(units).toEqual({ spent: 2, rest: 50, limit: 100 });
  });

  it('check передаёт Timestamp, FieldNames и scope', async () => {
    const { client, fetchMock } = setup({
      result: { Modified: { CampaignIds: [5] }, Timestamp: '2026-07-07T01:00:00Z' },
    });
    const svc = new ChangesService(client);

    const { result } = await svc.check('2026-07-07T00:00:00Z', ['CampaignIds', 'AdIds'], {
      CampaignIds: [5],
    });

    const { body } = lastCall(fetchMock);
    expect(body.method).toBe('check');
    expect(body.params.Timestamp).toBe('2026-07-07T00:00:00Z');
    expect(body.params.FieldNames).toEqual(['CampaignIds', 'AdIds']);
    expect(body.params.CampaignIds).toEqual([5]);
    expect(result.Modified?.CampaignIds).toEqual([5]);
  });
});

describe('KeywordBidsService', () => {
  it('set шлёт KeywordBids в /keywordbids и разбирает частичный успех', async () => {
    const { client, fetchMock } = setup({
      result: { SetResults: [{ KeywordId: 100 } as any, { Errors: [{ Code: 1, Message: 'bad bid' }] }] },
    });
    const svc = new KeywordBidsService(client);

    const res = await svc.set([
      { KeywordId: 100, Bid: 30_000_000 },
      { KeywordId: 101, Bid: -1 },
    ]);

    const { url, body } = lastCall(fetchMock);
    expect(url).toContain('/keywordbids');
    expect(body.method).toBe('set');
    expect(body.params.KeywordBids).toHaveLength(2);
    expect(res.succeeded).toHaveLength(1);
    expect(res.failed[0]).toMatchObject({ index: 1 });
    expect(res.failed[0].errors[0].message).toBe('bad bid');
  });
});

describe('DictionariesService', () => {
  it('geoRegions запрашивает GeoRegions и разворачивает массив', async () => {
    const { client, fetchMock } = setup({
      result: {
        GeoRegions: [{ GeoRegionId: 225, GeoRegionName: 'Россия', GeoRegionType: 'country' }],
      },
    });
    const svc = new DictionariesService(client);

    const { regions } = await svc.geoRegions();

    const { url, body } = lastCall(fetchMock);
    expect(url).toContain('/dictionaries');
    expect(body.params.DictionaryNames).toEqual(['GeoRegions']);
    expect(regions[0]?.GeoRegionName).toBe('Россия');
  });
});
