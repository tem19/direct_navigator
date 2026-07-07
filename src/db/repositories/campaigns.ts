import type { DB } from '../connection';
import type { Campaign } from '../../core/types';
import { rowToCampaign, type CampaignRow } from '../mappers';

/**
 * Репозиторий кампаний — единственное место с SQL для этой сущности.
 * Возвращает доменные объекты, наружу row-формат не протекает.
 */
export class CampaignRepository {
  constructor(private readonly db: DB) {}

  list(): Campaign[] {
    const rows = this.db
      .prepare('SELECT * FROM campaigns ORDER BY local_id')
      .all() as CampaignRow[];
    return rows.map(rowToCampaign);
  }

  getByLocalId(localId: number): Campaign | null {
    const row = this.db
      .prepare('SELECT * FROM campaigns WHERE local_id = ?')
      .get(localId) as CampaignRow | undefined;
    return row ? rowToCampaign(row) : null;
  }

  /** Строки, которые нужно отправить на сервер (в порядке для push). */
  listPending(): Campaign[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM campaigns
         WHERE sync_status IN ('new','modified','deleted')
         ORDER BY local_id`,
      )
      .all() as CampaignRow[];
    return rows.map(rowToCampaign);
  }

  insert(input: {
    name: string;
    status?: string;
    state?: string;
    dailyBudgetAmount?: number | null;
  }): Campaign {
    const now = new Date().toISOString();
    const info = this.db
      .prepare(
        `INSERT INTO campaigns
           (name, status, state, daily_budget_amount, sync_status, updated_at_local)
         VALUES (@name, @status, @state, @dailyBudgetAmount, 'new', @now)`,
      )
      .run({
        name: input.name,
        status: input.status ?? 'DRAFT',
        state: input.state ?? 'OFF',
        dailyBudgetAmount: input.dailyBudgetAmount ?? null,
        now,
      });
    const created = this.getByLocalId(Number(info.lastInsertRowid));
    if (!created) throw new Error('Не удалось создать кампанию');
    return created;
  }

  /** Обновляет имя/бюджет и переводит строку в modified (если была synced). */
  updateFields(
    localId: number,
    patch: Partial<Pick<Campaign, 'name' | 'dailyBudgetAmount' | 'state'>>,
  ): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE campaigns SET
           name = COALESCE(@name, name),
           daily_budget_amount = COALESCE(@dailyBudgetAmount, daily_budget_amount),
           state = COALESCE(@state, state),
           sync_status = CASE WHEN sync_status = 'synced' THEN 'modified' ELSE sync_status END,
           updated_at_local = @now
         WHERE local_id = @localId`,
      )
      .run({
        localId,
        name: patch.name ?? null,
        dailyBudgetAmount: patch.dailyBudgetAmount ?? null,
        state: patch.state ?? null,
        now,
      });
  }

  /** Применить успешный ответ сервера: проставить direct_id и пометить synced. */
  markSynced(localId: number, directId: number, serverHash: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE campaigns SET
           direct_id = @directId,
           server_hash = @serverHash,
           sync_status = 'synced',
           synced_at = @now
         WHERE local_id = @localId`,
      )
      .run({ localId, directId, serverHash, now });
  }

  findByDirectId(directId: number): Campaign | null {
    const row = this.db
      .prepare('SELECT * FROM campaigns WHERE direct_id = ?')
      .get(directId) as CampaignRow | undefined;
    return row ? rowToCampaign(row) : null;
  }

  /** Вставить кампанию, пришедшую с сервера, как synced. */
  insertFromServer(input: {
    directId: number;
    name: string;
    status: string;
    state: string;
    serverHash: string;
  }): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO campaigns
           (direct_id, name, status, state, sync_status, server_hash, updated_at_local, synced_at)
         VALUES (@directId, @name, @status, @state, 'synced', @serverHash, @now, @now)`,
      )
      .run({ ...input, now });
  }

  /** Обновить локальную synced-строку серверными данными. */
  updateFromServer(
    localId: number,
    input: { name: string; status: string; state: string; serverHash: string },
  ): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE campaigns SET
           name = @name, status = @status, state = @state,
           server_hash = @serverHash, sync_status = 'synced', synced_at = @now
         WHERE local_id = @localId`,
      )
      .run({ localId, ...input, now });
  }

  markConflict(localId: number): void {
    this.db
      .prepare(`UPDATE campaigns SET sync_status = 'conflict' WHERE local_id = ?`)
      .run(localId);
  }

  /** Пометить на удаление. Новые (без direct_id) удаляются сразу. */
  markDeleted(localId: number): void {
    const c = this.getByLocalId(localId);
    if (!c) return;
    if (c.directId === null) {
      this.hardDelete(localId);
      return;
    }
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE campaigns SET sync_status = 'deleted', updated_at_local = @now WHERE local_id = @localId`,
      )
      .run({ localId, now });
  }

  /** Физически удалить строку (после успешного удаления на сервере). */
  hardDelete(localId: number): void {
    this.db.prepare('DELETE FROM campaigns WHERE local_id = ?').run(localId);
  }

  /** Обновить серверный хэш после успешного push update (снимок = локальные поля). */
  refreshServerHash(localId: number, serverHash: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE campaigns SET server_hash = @serverHash, sync_status = 'synced', synced_at = @now
         WHERE local_id = @localId`,
      )
      .run({ localId, serverHash, now });
  }
}
