import Database from 'better-sqlite3';
import type { Database as DB } from 'better-sqlite3';
import { migrate } from './migrate';

/**
 * Открывает БД, включает нужные PRAGMA и прогоняет миграции.
 * Вызывается только из main-процесса.
 *
 * @param filename путь к файлу БД или ':memory:' для тестов.
 */
export function openDatabase(filename: string): DB {
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

export type { DB as Database };
