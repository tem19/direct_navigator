import type BetterSqlite3 from 'better-sqlite3'

/**
 * Ключ-значение для служебных данных. Значения хранятся как BLOB —
 * сюда кладётся, в частности, УЖЕ зашифрованный OAuth-токен
 * (шифрование выполняется в main через safeStorage).
 */
export class SettingsRepository {
  constructor(private readonly db: BetterSqlite3.Database) {}

  getBlob(key: string): Buffer | null {
    const row = this.db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as
      | { value: Buffer | null }
      | undefined
    return row?.value ?? null
  }

  setBlob(key: string, value: Buffer): void {
    this.db
      .prepare(
        `INSERT INTO app_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .run(key, value)
  }

  has(key: string): boolean {
    const row = this.db.prepare('SELECT 1 FROM app_settings WHERE key = ?').get(key)
    return row !== undefined
  }

  delete(key: string): void {
    this.db.prepare('DELETE FROM app_settings WHERE key = ?').run(key)
  }
}
