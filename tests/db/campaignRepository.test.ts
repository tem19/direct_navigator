import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openInMemoryDatabase, type AppDatabase } from '@db/connection';

describe('CampaignRepository', () => {
  let db: AppDatabase;
  let clientId: number;

  beforeEach(() => {
    db = openInMemoryDatabase();
    clientId = db.clients.create({ login: 'client-1', name: 'Client 1' });
  });

  afterEach(() => {
    db.close();
  });

  it('создаёт новую кампанию со статусом new и без direct_id', () => {
    const id = db.campaigns.create({ clientLocalId: clientId, name: 'C', type: 'TEXT_CAMPAIGN' });
    const c = db.campaigns.getById(id);
    expect(c).not.toBeNull();
    expect(c!.syncStatus).toBe('new');
    expect(c!.directId).toBeNull();
    expect(c!.serverHash).toBeNull();
  });

  it('list() возвращает пустой список на свежей БД', () => {
    expect(db.campaigns.list()).toEqual([]);
  });

  it('возвращает new-строку в списке на push', () => {
    const id = db.campaigns.create({ clientLocalId: clientId, name: 'C', type: 'TEXT_CAMPAIGN' });
    expect(db.campaigns.findPendingPush().map((c) => c.localId)).toContain(id);
  });

  it('после markPushed строка становится synced с direct_id и server_hash', () => {
    const id = db.campaigns.create({ clientLocalId: clientId, name: 'C', type: 'TEXT_CAMPAIGN' });
    db.campaigns.markPushed(id, 555);
    const c = db.campaigns.getById(id)!;
    expect(c.syncStatus).toBe('synced');
    expect(c.directId).toBe(555);
    expect(c.serverHash).not.toBeNull();
    expect(db.campaigns.findPendingPush().map((x) => x.localId)).not.toContain(id);
  });

  it('изменение synced-строки переводит её в modified и снова в push-список', () => {
    const id = db.campaigns.create({ clientLocalId: clientId, name: 'C', type: 'TEXT_CAMPAIGN' });
    db.campaigns.markPushed(id, 555);
    db.campaigns.update(id, { name: 'C2' });
    const c = db.campaigns.getById(id)!;
    expect(c.name).toBe('C2');
    expect(c.syncStatus).toBe('modified');
    expect(db.campaigns.findPendingPush().map((x) => x.localId)).toContain(id);
  });

  it('markDeleted помечает deleted (мягко), скрывает из list, но включает в push; finalizeDeleted удаляет', () => {
    const id = db.campaigns.create({ clientLocalId: clientId, name: 'C', type: 'TEXT_CAMPAIGN' });
    db.campaigns.markPushed(id, 555);
    db.campaigns.markDeleted(id);
    expect(db.campaigns.getById(id)!.syncStatus).toBe('deleted');
    expect(db.campaigns.list().map((x) => x.localId)).not.toContain(id);
    expect(db.campaigns.findPendingPush().map((x) => x.localId)).toContain(id);
    db.campaigns.finalizeDeleted(id);
    expect(db.campaigns.getById(id)).toBeNull();
  });

  it('upsertFromServer вставляет synced-строку при pull', () => {
    db.campaigns.upsertFromServer(
      {
        directId: 777,
        name: 'Server C',
        type: 'TEXT_CAMPAIGN',
        status: 'ACCEPTED',
        state: 'ON',
        dailyBudgetMicros: 1_000_000,
        startDate: null,
        endDate: null,
      },
      clientId,
    );
    const c = db.campaigns.findByDirectId(777)!;
    expect(c.syncStatus).toBe('synced');
    expect(c.name).toBe('Server C');
    expect(c.serverHash).not.toBeNull();
  });

  it('upsertFromServer помечает conflict, если сервер изменился под локальной правкой', () => {
    db.campaigns.upsertFromServer(
      {
        directId: 777,
        name: 'S',
        type: 'TEXT_CAMPAIGN',
        status: 'ACCEPTED',
        state: 'ON',
        dailyBudgetMicros: null,
        startDate: null,
        endDate: null,
      },
      clientId,
    );
    const local = db.campaigns.findByDirectId(777)!;
    db.campaigns.update(local.localId, { name: 'Local edit' });
    db.campaigns.upsertFromServer(
      {
        directId: 777,
        name: 'S changed',
        type: 'TEXT_CAMPAIGN',
        status: 'ACCEPTED',
        state: 'OFF',
        dailyBudgetMicros: null,
        startDate: null,
        endDate: null,
      },
      clientId,
    );
    const after = db.campaigns.findByDirectId(777)!;
    expect(after.syncStatus).toBe('conflict');
    expect(after.name).toBe('Local edit');
  });
});
