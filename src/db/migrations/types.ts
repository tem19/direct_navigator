import type { Database } from 'better-sqlite3';

/**
 * Версионированная миграция. Применяется по возрастанию `version`.
 * Правило: существующие миграции НЕ меняются — только добавляются новые.
 */
export interface Migration {
  version: number;
  name: string;
  up(db: Database): void;
}
