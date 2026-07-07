import { describe, it, expect, beforeEach } from 'vitest';
import { SyncEngine } from '../engine';
import type { SyncEngineDeps } from '../engine';
import { serverHash } from '../hash';
import { InsufficientUnitsError, RateLimitError } from '../errors';
import {
  FakeConflictRepo,
  FakeDirectApi,
  FakeEntityRepo,
  FakeLogRepo,
  FakeStateRepo,
  srv,
} from './fakes';

const ACCOUNT = 'sandbox-client';

function makeEngine(overrides: Partial<SyncEngineDeps> = {}) {
  const entities = new FakeEntityRepo();
  const state = new FakeStateRepo();
  const conflicts = new FakeConflictRepo();
  const log = new FakeLogRepo();
  const api = new FakeDirectApi();
  const engine = new SyncEngine({
    account: ACCOUNT,
    api,
    entities,
    state,
    conflicts,
    log,
    clock: { now: () => 1_000 },
    sleep: async () => {}, // тесты не ждут реально
    ...overrides,
  });
  return { engine, entities, state, conflicts, log, api };
}

describe('pull — инкрементальность через changes', () => {
  it('повторный pull без изменений не делает лишних get', async () => {
    const { engine, state, api } = makeEngine();
    state.setTimestamp(ACCOUNT, 'changes', 't-prev');
    api.checkResult = { timestamp: 't-next', notModified: true, modified: {}, deleted: {} };

    await engine.pull();

    expect(api.calls.filter((c) => c.startsWith('get:'))).toHaveLength(0);
    expect(api.calls).toContain('check');
    expect(state.getTimestamp(ACCOUNT, 'changes')).toBe('t-next');
  });

  it('применяет changes: новый серверный объект вставляется как synced', async () => {
    const { engine, entities, state, api } = makeEngine();
    state.setTimestamp(ACCOUNT, 'changes', 't-prev');
    api.checkResult = {
      timestamp: 't-next',
      notModified: false,
      modified: { campaign: [500] },
      deleted: {},
    };
    api.getResults.campaign = [srv('campaign', 500, { name: 'Кампания А' })];

    const report = await engine.pull();

    expect(api.calls).toContain('get:campaign:500');
    const row = entities.getByDirectId('campaign', 500);
    expect(row?.syncStatus).toBe('synced');
    expect(row?.fields).toEqual({ name: 'Кампания А' });
    expect(report.pulled).toBe(1);
  });
});

describe('pull — детект конфликтов', () => {
  it('локальная modified + сервер тоже изменился → conflict, правки не затёрты', async () => {
    const { engine, entities, state, conflicts, api } = makeEngine();
    state.setTimestamp(ACCOUNT, 'changes', 't-prev');

    // Локально изменили имя; server_hash хранит СТАРУЮ серверную версию.
    const oldServer = { name: 'Старое', bid: 10 };
    entities.seed({
      entityType: 'campaign',
      directId: 500,
      syncStatus: 'modified',
      serverHash: serverHash(oldServer),
      fields: { name: 'Моя правка', bid: 10 },
    });

    // Сервер тоже поменялся (bid стал другим).
    api.checkResult = {
      timestamp: 't-next',
      notModified: false,
      modified: { campaign: [500] },
      deleted: {},
    };
    api.getResults.campaign = [srv('campaign', 500, { name: 'Старое', bid: 99 })];

    const report = await engine.pull();

    expect(report.conflicts).toBe(1);
    const row = entities.getByDirectId('campaign', 500);
    expect(row?.syncStatus).toBe('conflict');
    expect(row?.fields).toEqual({ name: 'Моя правка', bid: 10 }); // НЕ затёрто
    const c = conflicts.list()[0];
    expect(c.diffs.map((d) => d.field).sort()).toEqual(['bid', 'name']);
  });

  it('synced + сервер изменился → тихо обновляем, без конфликта', async () => {
    const { engine, entities, state, api } = makeEngine();
    state.setTimestamp(ACCOUNT, 'changes', 't-prev');
    const old = { name: 'V1' };
    entities.seed({
      entityType: 'campaign',
      directId: 500,
      syncStatus: 'synced',
      serverHash: serverHash(old),
      fields: old,
    });
    api.checkResult = {
      timestamp: 't-next',
      notModified: false,
      modified: { campaign: [500] },
      deleted: {},
    };
    api.getResults.campaign = [srv('campaign', 500, { name: 'V2' })];

    const report = await engine.pull();
    expect(report.conflicts).toBe(0);
    expect(entities.getByDirectId('campaign', 500)?.fields).toEqual({ name: 'V2' });
  });
});

describe('push — порядок и перевешивание direct_id детей', () => {
  it('новая кампания → группа → объявление в правильном порядке, id проставлены', async () => {
    const { engine, entities, api } = makeEngine();

    const campaign = entities.seed({
      entityType: 'campaign',
      localId: 'c1',
      syncStatus: 'new',
      fields: { name: 'Новая' },
    });
    const group = entities.seed({
      entityType: 'adgroup',
      localId: 'g1',
      syncStatus: 'new',
      parentLocalId: 'c1',
      fields: { name: 'Группа' },
    });
    const ad = entities.seed({
      entityType: 'ad',
      localId: 'a1',
      syncStatus: 'new',
      parentLocalId: 'g1',
      fields: { title: 'Объявление' },
    });

    // Детерминированные id: кампания=2001, группа=2002, объявление=2003.
    let id = 2000;
    api.addHandler = (_t, objs) => ({
      units: { spent: 20, remaining: 100000, dailyLimit: 200000 },
      results: objs.map(() => ({ id: ++id })),
    });

    const report = await engine.push();

    // Порядок вызовов add: campaign → adgroup → ad.
    expect(api.calls).toEqual(['add:campaign:1', 'add:adgroup:1', 'add:ad:1']);

    expect(campaign.directId).toBe(2001);
    expect(campaign.syncStatus).toBe('synced');
    // Ребёнок получил direct_id родителя.
    expect(group.parentDirectId).toBe(2001);
    expect(ad.parentDirectId).toBe(2002);
    expect(report.pushed).toBe(3);
    expect(report.failed).toBe(0);
  });

  it('если родитель не создан — ребёнок пропускается, а не падает весь push', async () => {
    const { engine, entities, api } = makeEngine();
    entities.seed({
      entityType: 'campaign',
      localId: 'c1',
      syncStatus: 'new',
      fields: { name: 'Кампания' },
    });
    const orphanGroup = entities.seed({
      entityType: 'adgroup',
      localId: 'g1',
      syncStatus: 'new',
      parentLocalId: 'c1',
      fields: { name: 'Группа' },
    });

    // Кампания падает с ошибкой → её direct_id нет.
    api.addHandler = (t, objs) => {
      if (t === 'campaign') {
        return {
          units: { spent: 5, remaining: 100000, dailyLimit: 200000 },
          results: objs.map(() => ({ errors: [{ code: 8000, message: 'bad name' }] })),
        };
      }
      return { units: { spent: 0, remaining: 100000, dailyLimit: 200000 }, results: [] };
    };

    const report = await engine.push();

    // adgroup.add вообще не вызывался — ребёнок пропущен на этапе подготовки.
    expect(api.calls).toEqual(['add:campaign:1']);
    expect(orphanGroup.syncStatus).toBe('new'); // остался несинхронизированным
    expect(report.failed).toBe(2); // кампания (ошибка) + пропущенная группа
  });
});

describe('push — частичный успех', () => {
  it('ошибка одного элемента не валит весь батч', async () => {
    const { engine, entities, api, log } = makeEngine();
    const good = entities.seed({
      entityType: 'campaign',
      localId: 'ok',
      directId: 700,
      syncStatus: 'modified',
      fields: { name: 'Ок' },
    });
    const bad = entities.seed({
      entityType: 'campaign',
      localId: 'bad',
      directId: 701,
      syncStatus: 'modified',
      fields: { name: '' },
    });

    api.updateHandler = (_t, objs) => ({
      units: { spent: 15, remaining: 100000, dailyLimit: 200000 },
      results: objs.map((o) =>
        o.id === 701 ? { errors: [{ code: 8000, message: 'empty name' }] } : {},
      ),
    });

    const report = await engine.push();

    expect(good.syncStatus).toBe('synced');
    expect(bad.syncStatus).toBe('modified'); // оставлен изменённым для повтора
    expect(report.pushed).toBe(1);
    expect(report.failed).toBe(1);
    // Причина записана в журнал операций.
    expect(log.entries.some((e) => e.outcome === 'error' && e.message?.includes('empty name'))).toBe(
      true,
    );
  });
});

describe('push — баллы и лимиты', () => {
  it('нехватка баллов → InsufficientUnitsError до отправки запросов', async () => {
    const { engine, entities, api } = makeEngine();
    api.units = { spent: 0, remaining: 5, dailyLimit: 200000 }; // почти пусто
    entities.seed({ entityType: 'campaign', syncStatus: 'new', fields: { name: 'X' } });

    await expect(engine.push()).rejects.toBeInstanceOf(InsufficientUnitsError);
    expect(api.calls.filter((c) => c.startsWith('add:'))).toHaveLength(0);
  });

  it('error_code 56 → бэкофф и повтор пачки', async () => {
    const { engine, entities, api } = makeEngine();
    entities.seed({
      entityType: 'campaign',
      localId: 'c1',
      directId: 800,
      syncStatus: 'modified',
      fields: { name: 'Y' },
    });

    let attempts = 0;
    api.updateHandler = () => {
      attempts += 1;
      if (attempts < 3) throw new RateLimitError('campaign');
      return { units: { spent: 15, remaining: 100000, dailyLimit: 200000 }, results: [{}] };
    };

    const report = await engine.push();
    expect(attempts).toBe(3); // 2 падения + успех
    expect(report.pushed).toBe(1);
  });
});

describe('разрешение конфликтов', () => {
  let ctx: ReturnType<typeof makeEngine>;
  beforeEach(async () => {
    ctx = makeEngine();
    ctx.state.setTimestamp(ACCOUNT, 'changes', 't-prev');
    ctx.entities.seed({
      entityType: 'campaign',
      localId: 'c1',
      directId: 500,
      syncStatus: 'modified',
      serverHash: serverHash({ name: 'Старое' }),
      fields: { name: 'Локальное' },
    });
    ctx.api.checkResult = {
      timestamp: 't-next',
      notModified: false,
      modified: { campaign: [500] },
      deleted: {},
    };
    ctx.api.getResults.campaign = [srv('campaign', 500, { name: 'Серверное' })];
    await ctx.engine.pull();
  });

  it('takeServer → принять серверную версию, synced', () => {
    const c = ctx.engine.listConflicts()[0];
    ctx.engine.resolveConflict(c.id, 'takeServer');
    const row = ctx.entities.getByLocalId('campaign', 'c1');
    expect(row?.syncStatus).toBe('synced');
    expect(row?.fields).toEqual({ name: 'Серверное' });
    expect(ctx.engine.listConflicts()).toHaveLength(0);
  });

  it('keepLocal → остаётся modified, уйдёт на сервер при push', () => {
    const c = ctx.engine.listConflicts()[0];
    ctx.engine.resolveConflict(c.id, 'keepLocal');
    const row = ctx.entities.getByLocalId('campaign', 'c1');
    expect(row?.syncStatus).toBe('modified');
    expect(row?.fields).toEqual({ name: 'Локальное' });
  });
});
