import type { Migration } from './index';

/**
 * Таблица конфликтов: когда локальная строка изменена И сервер тоже изменился
 * с момента нашего снимка — кладём обе версии сюда для ручного разрешения.
 */
export const migration002: Migration = {
  version: 2,
  name: 'conflicts',
  up: (db) => {
    db.exec(`
      CREATE TABLE conflicts (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_kind  TEXT NOT NULL,
        local_id     INTEGER NOT NULL,
        direct_id    INTEGER,
        local_json   TEXT NOT NULL,
        server_json  TEXT NOT NULL,
        created_at   TEXT NOT NULL,
        UNIQUE(entity_kind, local_id)
      );
      CREATE INDEX idx_conflicts_entity ON conflicts(entity_kind);
    `);
  },
};
