import type BetterSqlite3 from 'better-sqlite3'

/**
 * Простой линейный раннер миграций на основе `PRAGMA user_version`.
 * Каждая миграция — SQL, применяемый в транзакции; версия инкрементируется.
 */
interface Migration {
  version: number
  name: string
  up: string
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'init',
    up: /* sql */ `
      -- Общие sync-поля повторяются в каждой синхронизируемой таблице:
      --   direct_id     — ID в Директе (NULL пока объект не отправлен)
      --   sync_status   — synced | new | modified | deleted | conflict
      --   server_hash   — снимок серверных полей для детекта конфликтов
      CREATE TABLE campaigns (
        local_id      INTEGER PRIMARY KEY AUTOINCREMENT,
        direct_id     INTEGER UNIQUE,
        name          TEXT    NOT NULL,
        status        TEXT    NOT NULL DEFAULT 'DRAFT',
        daily_budget  REAL,
        sync_status   TEXT    NOT NULL DEFAULT 'new',
        server_hash   TEXT,
        updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE ad_groups (
        local_id          INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_local_id INTEGER NOT NULL REFERENCES campaigns(local_id) ON DELETE CASCADE,
        direct_id         INTEGER UNIQUE,
        name              TEXT    NOT NULL,
        region_ids        TEXT    NOT NULL DEFAULT '[]',
        sync_status       TEXT    NOT NULL DEFAULT 'new',
        server_hash       TEXT,
        updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE ads (
        local_id          INTEGER PRIMARY KEY AUTOINCREMENT,
        ad_group_local_id INTEGER NOT NULL REFERENCES ad_groups(local_id) ON DELETE CASCADE,
        direct_id         INTEGER UNIQUE,
        title             TEXT    NOT NULL,
        title2            TEXT,
        text              TEXT    NOT NULL DEFAULT '',
        href              TEXT,
        status            TEXT    NOT NULL DEFAULT 'DRAFT',
        sync_status       TEXT    NOT NULL DEFAULT 'new',
        server_hash       TEXT,
        updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE keywords (
        local_id          INTEGER PRIMARY KEY AUTOINCREMENT,
        ad_group_local_id INTEGER NOT NULL REFERENCES ad_groups(local_id) ON DELETE CASCADE,
        direct_id         INTEGER UNIQUE,
        keyword           TEXT    NOT NULL,
        bid               REAL,
        sync_status       TEXT    NOT NULL DEFAULT 'new',
        server_hash       TEXT,
        updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      -- Ключ-значение для служебных данных (в т.ч. зашифрованный OAuth-токен).
      CREATE TABLE app_settings (
        key   TEXT PRIMARY KEY,
        value BLOB
      );

      CREATE INDEX idx_ad_groups_campaign ON ad_groups(campaign_local_id);
      CREATE INDEX idx_ads_group ON ads(ad_group_local_id);
      CREATE INDEX idx_keywords_group ON keywords(ad_group_local_id);
    `
  }
]

export function runMigrations(db: BetterSqlite3.Database): void {
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  const current = (db.pragma('user_version', { simple: true }) as number) ?? 0
  const pending = migrations.filter((m) => m.version > current).sort((a, b) => a.version - b.version)

  for (const migration of pending) {
    const apply = db.transaction(() => {
      db.exec(migration.up)
      db.pragma(`user_version = ${migration.version}`)
    })
    apply()
  }
}

export const latestSchemaVersion = migrations[migrations.length - 1]?.version ?? 0
