import Database from 'better-sqlite3';
import type { Database as DB } from 'better-sqlite3';
import { migrate } from './migrate';
import { createRepositories, type Repositories } from './repositories';
import { SettingsRepository } from './repositories/settingsRepository';

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

/**
 * Владелец соединения с локальной SQLite. Живёт только в main-процессе.
 * Держит инициализированные репозитории всех сущностей + служебные настройки.
 */
export class AppDatabase {
  readonly raw: DB;
  readonly clients: Repositories['clients'];
  readonly campaigns: Repositories['campaigns'];
  readonly adGroups: Repositories['adGroups'];
  readonly ads: Repositories['ads'];
  readonly keywords: Repositories['keywords'];
  readonly settings: SettingsRepository;

  constructor(filename: string) {
    this.raw = openDatabase(filename);
    const repos = createRepositories(this.raw);
    this.clients = repos.clients;
    this.campaigns = repos.campaigns;
    this.adGroups = repos.adGroups;
    this.ads = repos.ads;
    this.keywords = repos.keywords;
    this.settings = new SettingsRepository(this.raw);
  }

  close(): void {
    this.raw.close();
  }
}

/** Открыть БД в памяти — удобно для юнит-тестов репозиториев без ФС. */
export function openInMemoryDatabase(): AppDatabase {
  return new AppDatabase(':memory:');
}

export type { DB as Database };
