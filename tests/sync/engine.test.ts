import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, type DB } from '../../src/db/connection';
import { CampaignRepository } from '../../src/db/repositories/campaigns';
import { ConflictRepository } from '../../src/db/repositories/conflicts';
import { SyncStateRepository } from '../../src/db/repositories/sync-state';
import { DirectClient } from '../../src/direct-api/client';
import { SyncEngine } from '../../src/sync/engine';
import { hashServerSnapshot } from '../../src/core/hash';

type Handler = (params: Record<string, unknown>) => unknown;

/** Клиент с fetch-моком, маршрутизирующим по `${service}:${method}`. */
function makeClient(handlers: Record<string, Handler>): DirectClient {
  const fetchFn = async (url: string | URL, init?: RequestInit): Promise<Response> => {
    const service = url.toString().split('/').filter(Boolean).pop() as string;
    const body = JSON.parse((init?.body as string) ?? '{}') as {
      method: string;
      params: Record<string, unknown>;
    };
    const key = `${service}:${body.method}`;
    const handler = handlers[key];
    if (!handler) throw new Error(`Нет мока для ${key}`);
    return new Response(JSON.stringify({ result: handler(body.params) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', Units: '5/4995/5000' },
    });
  };
  return new DirectClient({
    baseUrl: 'https://api-sandbox.direct.yandex.com/json/v5/',
    getToken: () => 'TOK',
    fetchFn: fetchFn as unknown as typeof fetch,
  });
}

describe('SyncEngine', () => {
  let db: DB;
  let campaigns: CampaignRepository;
  let conflicts: ConflictRepository;
  let syncState: SyncStateRepository;

  beforeEach(() => {
    db = openDatabase(':memory:');
    campaigns = new CampaignRepository(db);
    conflicts = new ConflictRepository(db);
    syncState = new SyncStateRepository(db);
  });

  const engineWith = (handlers: Record<string, Handler>) =>
    new SyncEngine({ client: makeClient(handlers), campaigns, conflicts, syncState });

  it('первичный pull тянет кампании и сохраняет их как synced', async () => {
    const engine = engineWith({
      'changes:check': () => ({ Timestamp: 't1', ForceRefresh: 'YES' }),
      'campaigns:get': () => ({
        Campaigns: [{ Id: 10, Name: 'A', Status: 'ACCEPTED', State: 'ON' }],
      }),
    });

    const res = await engine.pull();

    expect(res.pulled).toBe(1);
    const list = campaigns.list();
    expect(list).toHaveLength(1);
    expect(list[0].directId).toBe(10);
    expect(list[0].syncStatus).toBe('synced');
    expect(syncState.getTimestamp('campaign')).toBe('t1');
    expect(engine.units?.balance).toBe(4995);
  });

  it('инкрементальный pull детектит конфликт (локально modified + сервер изменился)', async () => {
    // Локальная кампания уже синхронизирована со снимком исходного сервера.
    const c = campaigns.insert({ name: 'A' });
    const originalHash = hashServerSnapshot({ name: 'A', status: 'DRAFT', state: 'OFF' });
    campaigns.markSynced(c.localId, 10, originalHash);
    // Пользователь правит локально → modified, serverHash остаётся исходным.
    campaigns.updateFields(c.localId, { name: 'A-локально' });
    syncState.setTimestamp('campaign', 't0');

    const engine = engineWith({
      'changes:check': () => ({ Timestamp: 't1', Modified: { CampaignIds: [10] } }),
      'campaigns:get': () => ({
        Campaigns: [{ Id: 10, Name: 'A-сервер', Status: 'DRAFT', State: 'OFF' }],
      }),
    });

    await engine.pull();

    expect(conflicts.count()).toBe(1);
    expect(campaigns.getByLocalId(c.localId)?.syncStatus).toBe('conflict');
  });

  it('push: новые уходят через add, частичная ошибка изолируется', async () => {
    const ok = campaigns.insert({ name: 'ok' });
    const bad = campaigns.insert({ name: 'bad' });

    const engine = engineWith({
      'campaigns:add': () => ({
        AddResults: [{ Id: 100 }, { Errors: [{ Code: 1, Message: 'плохое имя' }] }],
      }),
    });

    const res = await engine.push();

    expect(res.pushed).toBe(1);
    expect(res.failures).toBe(1);
    expect(campaigns.getByLocalId(ok.localId)?.syncStatus).toBe('synced');
    expect(campaigns.getByLocalId(ok.localId)?.directId).toBe(100);
    // Ошибочная строка остаётся new — не потеряна.
    expect(campaigns.getByLocalId(bad.localId)?.syncStatus).toBe('new');
  });
});
