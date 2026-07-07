import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from '../migrate';
import { CampaignRepository, ClientRepository } from '../repositories';

function freshDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

describe('CampaignRepository', () => {
  let clients: ClientRepository;
  let campaigns: CampaignRepository;
  let clientId: number;

  beforeEach(() => {
    const db = freshDb();
    clients = new ClientRepository(db);
    campaigns = new CampaignRepository(db);
    clientId = clients.create({ login: 'client-1', name: 'Client 1' });
  });

  it('создаёт новую кампанию со статусом new и без direct_id', () => {
    const id = campaigns.create({ clientLocalId: clientId, name: 'C', type: 'TEXT_CAMPAIGN' });
    const c = campaigns.findByLocalId(id);
    expect(c).not.toBeNull();
    expect(c!.syncStatus).toBe('new');
    expect(c!.directId).toBeNull();
    expect(c!.serverHash).toBeNull();
  });

  it('возвращает new-строку в списке на push', () => {
    const id = campaigns.create({ clientLocalId: clientId, name: 'C', type: 'TEXT_CAMPAIGN' });
    const pending = campaigns.findPendingPush();
    expect(pending.map((c) => c.localId)).toContain(id);
  });

  it('после markPushed строка становится synced с direct_id и server_hash', () => {
    const id = campaigns.create({ clientLocalId: clientId, name: 'C', type: 'TEXT_CAMPAIGN' });
    campaigns.markPushed(id, 555);
    const c = campaigns.findByLocalId(id)!;
    expect(c.syncStatus).toBe('synced');
    expect(c.directId).toBe(555);
    expect(c.serverHash).not.toBeNull();
    expect(campaigns.findPendingPush().map((x) => x.localId)).not.toContain(id);
  });

  it('изменение synced-строки переводит её в modified и снова в push-список', () => {
    const id = campaigns.create({ clientLocalId: clientId, name: 'C', type: 'TEXT_CAMPAIGN' });
    campaigns.markPushed(id, 555);
    campaigns.update(id, { name: 'C2' });
    const c = campaigns.findByLocalId(id)!;
    expect(c.name).toBe('C2');
    expect(c.syncStatus).toBe('modified');
    expect(campaigns.findPendingPush().map((x) => x.localId)).toContain(id);
  });

  it('markDeleted помечает deleted (мягко) и включает в push; finalizeDeleted удаляет физически', () => {
    const id = campaigns.create({ clientLocalId: clientId, name: 'C', type: 'TEXT_CAMPAIGN' });
    campaigns.markPushed(id, 555);
    campaigns.markDeleted(id);
    expect(campaigns.findByLocalId(id)!.syncStatus).toBe('deleted');
    expect(campaigns.findAllVisible().map((x) => x.localId)).not.toContain(id);
    expect(campaigns.findPendingPush().map((x) => x.localId)).toContain(id);
    campaigns.finalizeDeleted(id);
    expect(campaigns.findByLocalId(id)).toBeNull();
  });

  it('upsertFromServer вставляет synced-строку при pull', () => {
    campaigns.upsertFromServer(
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
    const c = campaigns.findByDirectId(777)!;
    expect(c.syncStatus).toBe('synced');
    expect(c.name).toBe('Server C');
    expect(c.serverHash).not.toBeNull();
  });

  it('upsertFromServer помечает conflict, если сервер изменился под локальной правкой', () => {
    // pull -> synced
    campaigns.upsertFromServer(
      { directId: 777, name: 'S', type: 'TEXT_CAMPAIGN', status: 'ACCEPTED', state: 'ON', dailyBudgetMicros: null, startDate: null, endDate: null },
      clientId,
    );
    const local = campaigns.findByDirectId(777)!;
    // локальная правка
    campaigns.update(local.localId, { name: 'Local edit' });
    // повторный pull с ДРУГИМИ серверными данными
    campaigns.upsertFromServer(
      { directId: 777, name: 'S changed', type: 'TEXT_CAMPAIGN', status: 'ACCEPTED', state: 'OFF', dailyBudgetMicros: null, startDate: null, endDate: null },
      clientId,
    );
    const after = campaigns.findByDirectId(777)!;
    expect(after.syncStatus).toBe('conflict');
    expect(after.name).toBe('Local edit'); // локальные значения сохранены
  });
});
