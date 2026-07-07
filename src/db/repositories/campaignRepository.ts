import type BetterSqlite3 from 'better-sqlite3'
import type { Campaign, CampaignStatus, SyncStatus } from '@core/types'

/** Форма строки в таблице `campaigns` (snake_case как в SQL). */
interface CampaignRow {
  local_id: number
  direct_id: number | null
  name: string
  status: string
  daily_budget: number | null
  sync_status: string
  server_hash: string | null
  updated_at: string
}

function rowToCampaign(row: CampaignRow): Campaign {
  return {
    localId: row.local_id,
    directId: row.direct_id,
    name: row.name,
    status: row.status as CampaignStatus,
    dailyBudget: row.daily_budget,
    syncStatus: row.sync_status as SyncStatus,
    serverHash: row.server_hash,
    updatedAt: row.updated_at
  }
}

export interface NewCampaign {
  name: string
  status?: CampaignStatus
  dailyBudget?: number | null
}

/**
 * Репозиторий кампаний. Весь SQL по кампаниям живёт здесь (граница слоя db).
 */
export class CampaignRepository {
  constructor(private readonly db: BetterSqlite3.Database) {}

  list(): Campaign[] {
    const rows = this.db
      .prepare('SELECT * FROM campaigns ORDER BY local_id')
      .all() as CampaignRow[]
    return rows.map(rowToCampaign)
  }

  getById(localId: number): Campaign | null {
    const row = this.db
      .prepare('SELECT * FROM campaigns WHERE local_id = ?')
      .get(localId) as CampaignRow | undefined
    return row ? rowToCampaign(row) : null
  }

  create(input: NewCampaign): Campaign {
    const info = this.db
      .prepare(
        `INSERT INTO campaigns (name, status, daily_budget, sync_status)
         VALUES (@name, @status, @dailyBudget, 'new')`
      )
      .run({
        name: input.name,
        status: input.status ?? 'DRAFT',
        dailyBudget: input.dailyBudget ?? null
      })
    const created = this.getById(Number(info.lastInsertRowid))
    if (!created) throw new Error('Не удалось создать кампанию')
    return created
  }
}
