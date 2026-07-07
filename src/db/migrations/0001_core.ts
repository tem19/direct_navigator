import type { Migration } from './types';

/**
 * Базовая схема `core`: иерархия Client → Campaign → AdGroup → (Ad, Keyword)
 * с sync-метаданными на каждой синхронизируемой строке.
 *
 * Соглашения по sync-колонкам (одинаковы во всех таблицах):
 *   local_id         — свой автоинкремент (PK)
 *   direct_id        — ID в Яндекс Директе, NULL пока не выгружен
 *   sync_status      — synced | new | modified | deleted | conflict
 *   server_hash      — снимок серверных полей для детекта конфликтов, NULL для new
 *   updated_at_local — ISO-8601 UTC последней локальной правки
 *   synced_at        — ISO-8601 UTC последней успешной синхронизации, NULL если не было
 */
export const migration0001: Migration = {
  version: 1,
  name: 'core_schema',
  up(db) {
    db.exec(`
      -- ── clients ─────────────────────────────────────────────────────────
      CREATE TABLE clients (
        local_id         INTEGER PRIMARY KEY AUTOINCREMENT,
        direct_id        INTEGER,
        login            TEXT NOT NULL,
        name             TEXT,
        sync_status      TEXT NOT NULL DEFAULT 'new'
                           CHECK (sync_status IN ('synced','new','modified','deleted','conflict')),
        server_hash      TEXT,
        updated_at_local TEXT NOT NULL,
        synced_at        TEXT
      );
      CREATE UNIQUE INDEX ux_clients_direct_id ON clients(direct_id) WHERE direct_id IS NOT NULL;
      CREATE INDEX ix_clients_sync_status ON clients(sync_status);

      -- ── campaigns ───────────────────────────────────────────────────────
      CREATE TABLE campaigns (
        local_id            INTEGER PRIMARY KEY AUTOINCREMENT,
        direct_id           INTEGER,
        client_local_id     INTEGER NOT NULL REFERENCES clients(local_id) ON DELETE CASCADE,
        name                TEXT NOT NULL,
        type                TEXT NOT NULL,
        status              TEXT NOT NULL DEFAULT 'DRAFT',
        state               TEXT NOT NULL DEFAULT 'OFF',
        daily_budget_micros INTEGER,
        start_date          TEXT,
        end_date            TEXT,
        sync_status         TEXT NOT NULL DEFAULT 'new'
                              CHECK (sync_status IN ('synced','new','modified','deleted','conflict')),
        server_hash         TEXT,
        updated_at_local    TEXT NOT NULL,
        synced_at           TEXT
      );
      CREATE UNIQUE INDEX ux_campaigns_direct_id ON campaigns(direct_id) WHERE direct_id IS NOT NULL;
      CREATE INDEX ix_campaigns_client ON campaigns(client_local_id);
      CREATE INDEX ix_campaigns_sync_status ON campaigns(sync_status);

      -- ── ad_groups ───────────────────────────────────────────────────────
      CREATE TABLE ad_groups (
        local_id          INTEGER PRIMARY KEY AUTOINCREMENT,
        direct_id         INTEGER,
        campaign_local_id INTEGER NOT NULL REFERENCES campaigns(local_id) ON DELETE CASCADE,
        name              TEXT NOT NULL,
        type              TEXT NOT NULL,
        status            TEXT NOT NULL DEFAULT 'DRAFT',
        region_ids        TEXT,  -- JSON-массив geo id
        sync_status       TEXT NOT NULL DEFAULT 'new'
                            CHECK (sync_status IN ('synced','new','modified','deleted','conflict')),
        server_hash       TEXT,
        updated_at_local  TEXT NOT NULL,
        synced_at         TEXT
      );
      CREATE UNIQUE INDEX ux_ad_groups_direct_id ON ad_groups(direct_id) WHERE direct_id IS NOT NULL;
      CREATE INDEX ix_ad_groups_campaign ON ad_groups(campaign_local_id);
      CREATE INDEX ix_ad_groups_sync_status ON ad_groups(sync_status);

      -- ── ads ─────────────────────────────────────────────────────────────
      CREATE TABLE ads (
        local_id          INTEGER PRIMARY KEY AUTOINCREMENT,
        direct_id         INTEGER,
        ad_group_local_id INTEGER NOT NULL REFERENCES ad_groups(local_id) ON DELETE CASCADE,
        type              TEXT NOT NULL,
        status            TEXT NOT NULL DEFAULT 'DRAFT',
        title             TEXT NOT NULL,
        title2            TEXT,
        text              TEXT NOT NULL,
        href              TEXT,
        display_url_path  TEXT,
        sync_status       TEXT NOT NULL DEFAULT 'new'
                            CHECK (sync_status IN ('synced','new','modified','deleted','conflict')),
        server_hash       TEXT,
        updated_at_local  TEXT NOT NULL,
        synced_at         TEXT
      );
      CREATE UNIQUE INDEX ux_ads_direct_id ON ads(direct_id) WHERE direct_id IS NOT NULL;
      CREATE INDEX ix_ads_ad_group ON ads(ad_group_local_id);
      CREATE INDEX ix_ads_sync_status ON ads(sync_status);

      -- ── keywords ────────────────────────────────────────────────────────
      CREATE TABLE keywords (
        local_id           INTEGER PRIMARY KEY AUTOINCREMENT,
        direct_id          INTEGER,
        ad_group_local_id  INTEGER NOT NULL REFERENCES ad_groups(local_id) ON DELETE CASCADE,
        keyword            TEXT NOT NULL,
        state              TEXT NOT NULL DEFAULT 'ON',
        status             TEXT NOT NULL DEFAULT 'DRAFT',
        bid_micros         INTEGER,
        context_bid_micros INTEGER,
        sync_status        TEXT NOT NULL DEFAULT 'new'
                             CHECK (sync_status IN ('synced','new','modified','deleted','conflict')),
        server_hash        TEXT,
        updated_at_local   TEXT NOT NULL,
        synced_at          TEXT
      );
      CREATE UNIQUE INDEX ux_keywords_direct_id ON keywords(direct_id) WHERE direct_id IS NOT NULL;
      CREATE INDEX ix_keywords_ad_group ON keywords(ad_group_local_id);
      CREATE INDEX ix_keywords_sync_status ON keywords(sync_status);
    `);
  },
};
