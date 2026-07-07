import type { Migration } from './index';

/**
 * Базовая схема: campaigns → adgroups → (ads | keywords).
 * Общие для всех таблиц синхро-поля:
 *   direct_id, sync_status, server_hash, updated_at_local, synced_at.
 * Индексы по direct_id, внешним ключам и sync_status (частый фильтр для push).
 */
export const migration001: Migration = {
  version: 1,
  name: 'init',
  up: (db) => {
    db.exec(`
      CREATE TABLE campaigns (
        local_id           INTEGER PRIMARY KEY AUTOINCREMENT,
        direct_id          INTEGER UNIQUE,
        name               TEXT NOT NULL,
        status             TEXT NOT NULL DEFAULT 'DRAFT',
        state              TEXT NOT NULL DEFAULT 'OFF',
        daily_budget_amount INTEGER,
        sync_status        TEXT NOT NULL DEFAULT 'new',
        server_hash        TEXT,
        updated_at_local   TEXT NOT NULL,
        synced_at          TEXT
      );
      CREATE INDEX idx_campaigns_direct_id ON campaigns(direct_id);
      CREATE INDEX idx_campaigns_sync_status ON campaigns(sync_status);

      CREATE TABLE adgroups (
        local_id           INTEGER PRIMARY KEY AUTOINCREMENT,
        direct_id          INTEGER UNIQUE,
        campaign_local_id  INTEGER NOT NULL REFERENCES campaigns(local_id) ON DELETE CASCADE,
        name               TEXT NOT NULL,
        region_ids         TEXT NOT NULL DEFAULT '[]',
        sync_status        TEXT NOT NULL DEFAULT 'new',
        server_hash        TEXT,
        updated_at_local   TEXT NOT NULL,
        synced_at          TEXT
      );
      CREATE INDEX idx_adgroups_direct_id ON adgroups(direct_id);
      CREATE INDEX idx_adgroups_campaign ON adgroups(campaign_local_id);
      CREATE INDEX idx_adgroups_sync_status ON adgroups(sync_status);

      CREATE TABLE ads (
        local_id           INTEGER PRIMARY KEY AUTOINCREMENT,
        direct_id          INTEGER UNIQUE,
        adgroup_local_id   INTEGER NOT NULL REFERENCES adgroups(local_id) ON DELETE CASCADE,
        type               TEXT NOT NULL DEFAULT 'TEXT_AD',
        title              TEXT NOT NULL,
        title2             TEXT,
        text               TEXT NOT NULL,
        href               TEXT,
        state              TEXT NOT NULL DEFAULT 'OFF',
        sync_status        TEXT NOT NULL DEFAULT 'new',
        server_hash        TEXT,
        updated_at_local   TEXT NOT NULL,
        synced_at          TEXT
      );
      CREATE INDEX idx_ads_direct_id ON ads(direct_id);
      CREATE INDEX idx_ads_adgroup ON ads(adgroup_local_id);
      CREATE INDEX idx_ads_sync_status ON ads(sync_status);

      CREATE TABLE keywords (
        local_id           INTEGER PRIMARY KEY AUTOINCREMENT,
        direct_id          INTEGER UNIQUE,
        adgroup_local_id   INTEGER NOT NULL REFERENCES adgroups(local_id) ON DELETE CASCADE,
        keyword            TEXT NOT NULL,
        bid                REAL,
        state              TEXT NOT NULL DEFAULT 'OFF',
        sync_status        TEXT NOT NULL DEFAULT 'new',
        server_hash        TEXT,
        updated_at_local   TEXT NOT NULL,
        synced_at          TEXT
      );
      CREATE INDEX idx_keywords_direct_id ON keywords(direct_id);
      CREATE INDEX idx_keywords_adgroup ON keywords(adgroup_local_id);
      CREATE INDEX idx_keywords_sync_status ON keywords(sync_status);

      -- Метка времени последней успешной синхронизации per-сущность (для changes).
      CREATE TABLE sync_state (
        entity_kind    TEXT PRIMARY KEY,
        last_timestamp TEXT
      );
    `);
  },
};
