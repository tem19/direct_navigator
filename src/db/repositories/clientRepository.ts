import type { Database } from 'better-sqlite3';
import { clientFromRow, clientServerSnapshot, nowIso, type Client, type NewClient } from '../../core';
import type { ClientRow } from '../../core/mappers/rows';
import { BaseSyncRepository } from './base';

export class ClientRepository extends BaseSyncRepository<Client, ClientRow> {
  constructor(db: Database) {
    super(db, 'clients', clientFromRow, clientServerSnapshot);
  }

  create(input: NewClient): number {
    const info = this.db
      .prepare(
        `INSERT INTO clients (direct_id, login, name, sync_status, server_hash, updated_at_local, synced_at)
         VALUES (@directId, @login, @name, 'new', NULL, @now, NULL)`,
      )
      .run({
        directId: input.directId ?? null,
        login: input.login,
        name: input.name ?? null,
        now: nowIso(),
      });
    return Number(info.lastInsertRowid);
  }

  update(localId: number, patch: Partial<Pick<NewClient, 'name'>>): void {
    const current = this.findByLocalId(localId);
    if (!current) throw new Error(`client ${localId} not found`);
    this.db
      .prepare(`UPDATE clients SET name=@name WHERE local_id=@localId`)
      .run({ name: patch.name !== undefined ? patch.name : current.name, localId });
    this.markModified(localId);
  }

  findByLogin(login: string): Client | null {
    const row = this.db.prepare(`SELECT * FROM clients WHERE login = ?`).get(login) as
      | ClientRow
      | undefined;
    return row ? clientFromRow(row) : null;
  }
}
