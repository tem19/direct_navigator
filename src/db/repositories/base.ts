import type { Database } from 'better-sqlite3';
import { computeServerHash, nowIso, type SyncMeta, type SyncStatus } from '../../core';
import type { SyncRowBase } from '../../core/mappers/rows';

/** Строки, ожидающие выгрузки на сервер. */
export const PUSH_STATUSES: readonly SyncStatus[] = ['new', 'modified', 'deleted'];

/**
 * Базовый класс синхронизируемого репозитория.
 *
 * Инкапсулирует общую sync-механику (статусы, server_hash, выборка на push,
 * применение серверного ответа) — единственное место, знающее SQL для этих
 * операций. Конкретные репозитории добавляют вставку/обновление доменных полей.
 */
export abstract class BaseSyncRepository<TDomain extends SyncMeta, TRow extends SyncRowBase> {
  protected constructor(
    protected readonly db: Database,
    protected readonly table: string,
    protected readonly rowToDomain: (row: TRow) => TDomain,
    /** Снимок серверно-владелых полей домена — для server_hash. */
    protected readonly serverSnapshot: (d: TDomain) => Record<string, unknown>,
  ) {}

  findByLocalId(localId: number): TDomain | null {
    const row = this.db
      .prepare(`SELECT * FROM ${this.table} WHERE local_id = ?`)
      .get(localId) as TRow | undefined;
    return row ? this.rowToDomain(row) : null;
  }

  findByDirectId(directId: number): TDomain | null {
    const row = this.db
      .prepare(`SELECT * FROM ${this.table} WHERE direct_id = ?`)
      .get(directId) as TRow | undefined;
    return row ? this.rowToDomain(row) : null;
  }

  /** Все строки, кроме помеченных на удаление (для отображения в гриде). */
  findAllVisible(): TDomain[] {
    const rows = this.db
      .prepare(`SELECT * FROM ${this.table} WHERE sync_status != 'deleted' ORDER BY local_id`)
      .all() as TRow[];
    return rows.map(this.rowToDomain);
  }

  /** Строки, требующие выгрузки на сервер (new / modified / deleted). */
  findPendingPush(): TDomain[] {
    const placeholders = PUSH_STATUSES.map(() => '?').join(',');
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.table} WHERE sync_status IN (${placeholders}) ORDER BY local_id`,
      )
      .all(...PUSH_STATUSES) as TRow[];
    return rows.map(this.rowToDomain);
  }

  /** Пометить строку изменённой локально (synced -> modified; new остаётся new). */
  markModified(localId: number): void {
    this.db
      .prepare(
        `UPDATE ${this.table}
           SET sync_status = CASE sync_status WHEN 'synced' THEN 'modified' ELSE sync_status END,
               updated_at_local = ?
         WHERE local_id = ?`,
      )
      .run(nowIso(), localId);
  }

  /** Мягкое удаление: пометить 'deleted'. Физически удалит finalizeDeleted после push. */
  markDeleted(localId: number): void {
    this.db
      .prepare(`UPDATE ${this.table} SET sync_status = 'deleted', updated_at_local = ? WHERE local_id = ?`)
      .run(nowIso(), localId);
  }

  markConflict(localId: number): void {
    this.db
      .prepare(`UPDATE ${this.table} SET sync_status = 'conflict' WHERE local_id = ?`)
      .run(localId);
  }

  /**
   * Применить успешный результат push для new/modified строки:
   * проставить direct_id (если был new), пересчитать server_hash, statuses -> synced.
   */
  markPushed(localId: number, directId: number): void {
    const domain = this.findByLocalId(localId);
    if (!domain) return;
    const hash = computeServerHash(this.serverSnapshot(domain));
    this.db
      .prepare(
        `UPDATE ${this.table}
           SET direct_id = ?, sync_status = 'synced', server_hash = ?, synced_at = ?
         WHERE local_id = ?`,
      )
      .run(directId, hash, nowIso(), localId);
  }

  /** Физически удалить строку после успешного push удаления. */
  finalizeDeleted(localId: number): void {
    this.db.prepare(`DELETE FROM ${this.table} WHERE local_id = ?`).run(localId);
  }

  /** Пометить строку synced с явным server_hash (используется при pull). */
  protected markSyncedByDirectId(directId: number, serverHash: string): void {
    this.db
      .prepare(
        `UPDATE ${this.table} SET sync_status = 'synced', server_hash = ?, synced_at = ? WHERE direct_id = ?`,
      )
      .run(serverHash, nowIso(), directId);
  }
}
