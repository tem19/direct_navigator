import type { DB } from '../connection';
import type { EntityKind } from '../../core/types';

/** Хранит метку времени последней синхронизации per-сущность (для changes). */
export class SyncStateRepository {
  constructor(private readonly db: DB) {}

  getTimestamp(kind: EntityKind): string | null {
    const row = this.db
      .prepare('SELECT last_timestamp FROM sync_state WHERE entity_kind = ?')
      .get(kind) as { last_timestamp: string | null } | undefined;
    return row?.last_timestamp ?? null;
  }

  setTimestamp(kind: EntityKind, timestamp: string): void {
    this.db
      .prepare(
        `INSERT INTO sync_state (entity_kind, last_timestamp)
         VALUES (@kind, @ts)
         ON CONFLICT(entity_kind) DO UPDATE SET last_timestamp = @ts`,
      )
      .run({ kind, ts: timestamp });
  }
}
