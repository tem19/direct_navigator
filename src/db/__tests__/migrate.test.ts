import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { currentSchemaVersion, migrate } from '../migrate';
import { MIGRATIONS } from '../migrations';

describe('migrations', () => {
  it('поднимает свежую БД прогоном всех миграций', () => {
    const db = new Database(':memory:');
    migrate(db);

    const maxVersion = Math.max(...MIGRATIONS.map((m) => m.version));
    expect(currentSchemaVersion(db)).toBe(maxVersion);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: { name: string }) => r.name);
    expect(tables).toEqual(
      expect.arrayContaining(['clients', 'campaigns', 'ad_groups', 'ads', 'keywords']),
    );
  });

  it('идемпотентна: повторный прогон ничего не добавляет', () => {
    const db = new Database(':memory:');
    migrate(db);
    const first = db.prepare('SELECT COUNT(*) AS c FROM schema_version').get() as { c: number };
    migrate(db);
    const second = db.prepare('SELECT COUNT(*) AS c FROM schema_version').get() as { c: number };
    expect(second.c).toBe(first.c);
  });

  it('включает внешние ключи (каскад удаления)', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    migrate(db);
    const now = new Date().toISOString();
    const c = db
      .prepare(
        `INSERT INTO clients (login, name, updated_at_local) VALUES ('l', 'n', ?)`,
      )
      .run(now);
    db.prepare(
      `INSERT INTO campaigns (client_local_id, name, type, updated_at_local) VALUES (?, 'k', 'TEXT_CAMPAIGN', ?)`,
    ).run(c.lastInsertRowid, now);
    db.prepare('DELETE FROM clients WHERE local_id = ?').run(c.lastInsertRowid);
    const left = db.prepare('SELECT COUNT(*) AS c FROM campaigns').get() as { c: number };
    expect(left.c).toBe(0);
  });
});
