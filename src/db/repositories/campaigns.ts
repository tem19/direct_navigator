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
}
