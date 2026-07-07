import type BetterSqlite3 from 'better-sqlite3';
import { migration001 } from './001_init';
import { migration002 } from './002_conflicts';

export interface Migration {
  version: number;
  name: string;
  up: (db: BetterSqlite3.Database) => void;
}

/** Все миграции по возрастанию версии. Новые добавляются в конец. */
export const MIGRATIONS: Migration[] = [migration001, migration002];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.reduce(
  (max, m) => Math.max(max, m.version),
  0,
);

/**
 * Применяет недостающие миграции по порядку в одной транзакции каждая.
 * Текущая версия хранится в `PRAGMA user_version`.
 */
export function runMigrations(db: BetterSqlite3.Database): number {
  db.pragma('foreign_keys = ON');
  const current = db.pragma('user_version', { simple: true }) as number;

  const pending = MIGRATIONS.filter((m) => m.version > current).sort(
    (a, b) => a.version - b.version,
  );

  for (const m of pending) {
    const apply = db.transaction(() => {
      m.up(db);
      db.pragma(`user_version = ${m.version}`);
    });
    apply();
  }

  return db.pragma('user_version', { simple: true }) as number;
}
