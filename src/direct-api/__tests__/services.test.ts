import { describe, expect, it, vi } from 'vitest';
import { DirectApiClient } from '../client';
import { AdGroupsService } from '../services/adgroups';
import { AdsService } from '../services/ads';
import { KeywordsService } from '../services/keywords';
import { CampaignsService } from '../services/campaigns';
import { DIRECT_BASE_URL } from '../config';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { Units: '3/100/200' } });
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

/** Достаёт [url, разобранное-тело] последнего вызова fetch. */
function lastCall(fetchMock: ReturnType<typeof vi.fn>): { url: string; body: any } {
  const [url, opts] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
  return { url, body: JSON.parse(opts.body as string) };
}

describe('AdGroupsService', () => {
  it('add шлёт в /adgroups и разбирает частичный успех', async () => {
    const { client, fetchMock } = setup({
      result: { AddResults: [{ Id: 10 }, { Errors: [{ Code: 1, Message: 'bad' }] }] },
    });
    const svc = new AdGroupsService(client);

    const res = await svc.add([
      { Name: 'g1', CampaignId: 1, RegionIds: [225] },
      { Name: 'g2', CampaignId: 1, RegionIds: [225] },
    ]);

    const { url, body } = lastCall(fetchMock);
    expect(url).toBe('https://api-sandbox.direct.yandex.com/json/v5/adgroups');
    expect(body.method).toBe('add');
    expect(body.params.AdGroups).toHaveLength(2);
    expect(res.succeeded[0]).toMatchObject({ id: 10, index: 0 });
    expect(res.failed[0]).toMatchObject({ index: 1 });
  });
});

describe('AdsService', () => {
  it('moderate шлёт метод moderate с SelectionCriteria.Ids в /ads', async () => {
    const { client, fetchMock } = setup({ result: { ActionResults: [{ Id: 5 }, { Id: 6 }] } });
    const svc = new AdsService(client);

    const res = await svc.moderate([5, 6]);

    const { url, body } = lastCall(fetchMock);
    expect(url).toContain('/ads');
    expect(body.method).toBe('moderate');
    expect(body.params.SelectionCriteria.Ids).toEqual([5, 6]);
    expect(res.hasErrors).toBe(false);
    expect(res.succeeded.map((s) => s.id)).toEqual([5, 6]);
  });

  it('getAll подставляет TextAdFieldNames', async () => {
    const { client, fetchMock } = setup({ result: { Ads: [] } });
    const svc = new AdsService(client);

    await svc.getAll({ CampaignIds: [1] });

    const { body } = lastCall(fetchMock);
    expect(body.params.TextAdFieldNames).toContain('Title');
    expect(body.params.SelectionCriteria.CampaignIds).toEqual([1]);
  });
});

describe('KeywordsService', () => {
  it('suspend шлёт метод suspend в /keywords', async () => {
    const { client, fetchMock } = setup({ result: { ActionResults: [{ Id: 42 }] } });
    const svc = new KeywordsService(client);

    const res = await svc.suspend([42]);

    const { url, body } = lastCall(fetchMock);
    expect(url).toContain('/keywords');
    expect(body.method).toBe('suspend');
    expect(res.succeeded[0]?.id).toBe(42);
  });
});

describe('CampaignsService', () => {
  it('archive маршрутизируется в /campaigns с методом archive', async () => {
    const { client, fetchMock } = setup({ result: { ActionResults: [{ Id: 1 }] } });
    const svc = new CampaignsService(client);

    await svc.archive([1]);

    const { url, body } = lastCall(fetchMock);
    expect(url).toContain('/campaigns');
    expect(body.method).toBe('archive');
  });
});
