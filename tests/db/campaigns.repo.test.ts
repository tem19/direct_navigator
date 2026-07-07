import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, type DB } from '../../src/db/connection';
import { CampaignRepository } from '../../src/db/repositories/campaigns';

/**
 * Тесты репозитория поверх in-memory SQLite.
 * ВНИМАНИЕ: требуют собранного нативного better-sqlite3 под текущий Node.
 * В среде без нативной сборки (напр. CI-контейнер без доступа к бинарям) —
 * запускаются на машине разработчика (`npm run rebuild` не нужен для Node-режима).
 */
describe('CampaignRepository', () => {
  let db: DB;
  let repo: CampaignRepository;

  beforeEach(() => {
    db = openDatabase(':memory:');
    repo = new CampaignRepository(db);
  });

  it('вставляет кампанию как new и возвращает её', () => {
    const c = repo.insert({ name: 'Тест' });
    expect(c.name).toBe('Тест');
    expect(c.syncStatus).toBe('new');
    expect(c.directId).toBeNull();
    expect(repo.list()).toHaveLength(1);
  });

  it('правка synced-строки переводит её в modified', () => {
    const c = repo.insert({ name: 'A' });
    repo.markSynced(c.localId, 555, 'hash1');
    expect(repo.getByLocalId(c.localId)?.syncStatus).toBe('synced');

    repo.updateFields(c.localId, { name: 'A2' });
    const after = repo.getByLocalId(c.localId);
    expect(after?.name).toBe('A2');
    expect(after?.syncStatus).toBe('modified');
  });

  it('listPending отдаёт new/modified/deleted', () => {
    const a = repo.insert({ name: 'new-one' });
    const b = repo.insert({ name: 'synced-one' });
    repo.markSynced(b.localId, 1, 'h');
    expect(repo.listPending().map((c) => c.localId)).toEqual([a.localId]);
  });
});
