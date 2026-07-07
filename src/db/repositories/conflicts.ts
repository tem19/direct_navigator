import type { DB } from '../connection';
import type { EntityKind } from '../../core/types';

export interface ConflictRecord {
  id: number;
  entityKind: EntityKind;
  localId: number;
  directId: number | null;
  local: unknown;
  server: unknown;
  createdAt: string;
}

interface ConflictRow {
  id: number;
  entity_kind: string;
  local_id: number;
  direct_id: number | null;
  local_json: string;
  server_json: string;
  created_at: string;
}

/** Очередь конфликтов синхронизации + их разрешение. */
export class ConflictRepository {
  constructor(private readonly db: DB) {}

  upsert(input: {
    entityKind: EntityKind;
    localId: number;
    directId: number | null;
    local: unknown;
    server: unknown;
  }): void {
    this.db
      .prepare(
        `INSERT INTO conflicts
           (entity_kind, local_id, direct_id, local_json, server_json, created_at)
         VALUES (@kind, @localId, @directId, @local, @server, @now)
         ON CONFLICT(entity_kind, local_id) DO UPDATE SET
           local_json = @local, server_json = @server, created_at = @now`,
      )
      .run({
        kind: input.entityKind,
        localId: input.localId,
        directId: input.directId,
        local: JSON.stringify(input.local),
        server: JSON.stringify(input.server),
        now: new Date().toISOString(),
      });
  }

  list(): ConflictRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM conflicts ORDER BY id')
      .all() as ConflictRow[];
    return rows.map((r) => ({
      id: r.id,
      entityKind: r.entity_kind as EntityKind,
      localId: r.local_id,
      directId: r.direct_id,
      local: JSON.parse(r.local_json),
      server: JSON.parse(r.server_json),
      createdAt: r.created_at,
    }));
  }

  resolve(entityKind: EntityKind, localId: number): void {
    this.db
      .prepare('DELETE FROM conflicts WHERE entity_kind = ? AND local_id = ?')
      .run(entityKind, localId);
  }

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS n FROM conflicts').get() as {
      n: number;
    };
    return row.n;
  }
}
