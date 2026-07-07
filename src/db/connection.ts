import Database from 'better-sqlite3';
import { runMigrations } from './migrations';

export type DB = Database.Database;

/**
 * Открывает БД и приводит схему к последней версии.
 * @param filename путь к файлу БД или ':memory:' (для тестов).
 */
export function openDatabase(filename: string): DB {
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}
