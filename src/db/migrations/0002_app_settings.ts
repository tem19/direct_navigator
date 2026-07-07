import type { Migration } from './types';

/**
 * Служебная таблица ключ-значение. Хранит, в частности, УЖЕ зашифрованный
 * OAuth-токен (шифрование — в main через safeStorage), см. TokenStore.
 */
export const migration0002: Migration = {
  version: 2,
  name: 'app_settings',
  up(db) {
    db.exec(`
      CREATE TABLE app_settings (
        key   TEXT PRIMARY KEY,
        value BLOB
      );
    `);
  },
};
