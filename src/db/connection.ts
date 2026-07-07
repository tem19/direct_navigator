import Database from 'better-sqlite3'
import { runMigrations } from './migrations'
import { CampaignRepository } from './repositories/campaignRepository'
import { SettingsRepository } from './repositories/settingsRepository'

/**
 * Владелец соединения с локальной SQLite. Живёт только в main-процессе.
 * Держит инициализированные репозитории.
 */
export class AppDatabase {
  readonly raw: Database.Database
  readonly campaigns: CampaignRepository
  readonly settings: SettingsRepository

  constructor(filename: string) {
    this.raw = new Database(filename)
    runMigrations(this.raw)
    this.campaigns = new CampaignRepository(this.raw)
    this.settings = new SettingsRepository(this.raw)
  }

  close(): void {
    this.raw.close()
  }
}

/**
 * Открыть БД в памяти — удобно для юнит-тестов репозиториев без файловой системы.
 */
export function openInMemoryDatabase(): AppDatabase {
  return new AppDatabase(':memory:')
}
