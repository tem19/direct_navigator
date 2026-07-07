import type { Database } from 'better-sqlite3';
import { MIGRATIONS } from './migrations';

/**
 * Применяет все миграции с версией > текущей schema_version, по возрастанию,
 * каждую в отдельной транзакции. Идемпотентно: повторный вызов — no-op.
 */
export function migrate(db: Database): number {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version    INTEGER NOT NULL,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const currentRow = db
    .prepare('SELECT COALESCE(MAX(version), 0) AS v FROM schema_version')
    .get() as { v: number };
  const current = currentRow.v;

  const pending = [...MIGRATIONS]
    .sort((a, b) => a.version - b.version)
    .filter((m) => m.version > current);

  const record = db.prepare(
    'INSERT INTO schema_version (version, name, applied_at) VALUES (?, ?, ?)',
  );

  for (const m of pending) {
    const apply = db.transaction(() => {
      m.up(db);
      record.run(m.version, m.name, new Date().toISOString());
    });
    apply();
  }

  return pending.length > 0 ? pending[pending.length - 1].version : current;
}

export function currentSchemaVersion(db: Database): number {
  const row = db
    .prepare('SELECT COALESCE(MAX(version), 0) AS v FROM schema_version')
    .get() as { v: number } | undefined;
  return row?.v ?? 0;
}
