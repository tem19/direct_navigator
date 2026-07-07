import Database from 'better-sqlite3';
import { runMigrations } from './migrations';

export type DB = Database.Database;

/** Колонки, наличие которых обязательно (страховка от устаревшего файла БД). */
const REQUIRED_CAMPAIGN_COLUMNS = ['state', 'sync_status', 'server_hash'];

/**
 * Открывает БД и приводит схему к последней версии.
 * @param filename путь к файлу БД или ':memory:' (для тестов).
 */
export function openDatabase(filename: string): DB {
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  assertSchemaFresh(db, filename);
  return db;
}

/**
 * Проверяет, что таблица campaigns имеет ожидаемые колонки. Если файл БД остался
 * от старой/частичной схемы, миграции в него не докатятся (версия уже проставлена),
 * и обычный INSERT упадёт с невнятной ошибкой. Здесь — понятная диагностика.
 */
function assertSchemaFresh(db: DB, filename: string): void {
  const cols = (db.prepare('PRAGMA table_info(campaigns)').all() as Array<{ name: string }>).map(
    (c) => c.name,
  );
  const missing = REQUIRED_CAMPAIGN_COLUMNS.filter((c) => !cols.includes(c));
  if (missing.length > 0) {
    throw new Error(
      `Устаревшая схема БД (нет колонок: ${missing.join(', ')}). ` +
        `Удалите файл базы и перезапустите приложение:\n  ${filename}`,
    );
  }
}
