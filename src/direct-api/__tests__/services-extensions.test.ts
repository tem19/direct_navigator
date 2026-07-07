import { describe, expect, it, vi } from 'vitest';
import { DirectApiClient } from '../client';
import { SitelinksService } from '../services/sitelinks';
import { VCardsService } from '../services/vcards';
import { AdExtensionsService } from '../services/adextensions';
import { DIRECT_BASE_URL } from '../config';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { Units: '1/40/100' } });
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

describe('SitelinksService', () => {
  it('add шлёт SitelinksSets в /sitelinks', async () => {
    const { client, fetchMock } = setup({ result: { AddResults: [{ Id: 77 }] } });
    const svc = new SitelinksService(client);

    const res = await svc.add([{ Sitelinks: [{ Title: 'Доставка', Href: 'https://x/y' }] }]);

    const { url, body } = lastCall(fetchMock);
    expect(url).toContain('/sitelinks');
    expect(body.method).toBe('add');
    expect(body.params.SitelinksSets[0].Sitelinks[0].Title).toBe('Доставка');
    expect(res.succeeded[0]?.id).toBe(77);
  });

  it('getAll подставляет SitelinkFieldNames', async () => {
    const { client, fetchMock } = setup({ result: { SitelinksSets: [] } });
    const svc = new SitelinksService(client);

    await svc.getAll({ Ids: [1] });

    const { body } = lastCall(fetchMock);
    expect(body.params.SitelinkFieldNames).toContain('Title');
  });
});

describe('VCardsService', () => {
  it('add шлёт VCards в /vcards и разбирает частичный успех', async () => {
    const { client, fetchMock } = setup({
      result: { AddResults: [{ Id: 9 }, { Errors: [{ Code: 2, Message: 'bad phone' }] }] },
    });
    const svc = new VCardsService(client);

    const res = await svc.add([
      { CampaignId: 1, Country: 'Россия', City: 'Москва', Company: 'ООО', Phone: { CityCode: '495', PhoneNumber: '1234567' } },
      { CampaignId: 1, Country: 'Россия', City: 'Москва', Company: 'ООО', Phone: { CityCode: '', PhoneNumber: '' } },
    ]);

    const { url } = lastCall(fetchMock);
    expect(url).toContain('/vcards');
    expect(res.succeeded[0]?.id).toBe(9);
    expect(res.failed[0]?.errors[0].message).toBe('bad phone');
  });
});

describe('AdExtensionsService', () => {
  it('add шлёт AdExtensions в /adextensions', async () => {
    const { client, fetchMock } = setup({ result: { AddResults: [{ Id: 55 }] } });
    const svc = new AdExtensionsService(client);

    const res = await svc.add([{ Callout: { CalloutText: 'Бесплатная доставка' } }]);

    const { url, body } = lastCall(fetchMock);
    expect(url).toContain('/adextensions');
    expect(body.params.AdExtensions[0].Callout.CalloutText).toBe('Бесплатная доставка');
    expect(res.succeeded[0]?.id).toBe(55);
  });

  it('delete шлёт SelectionCriteria.Ids', async () => {
    const { client, fetchMock } = setup({ result: { DeleteResults: [{ Id: 55 }] } });
    const svc = new AdExtensionsService(client);

    await svc.delete([55]);

    const { body } = lastCall(fetchMock);
    expect(body.method).toBe('delete');
    expect(body.params.SelectionCriteria.Ids).toEqual([55]);
  });
});
