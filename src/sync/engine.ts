/**
 * Каркас движка синхронизации local <-> Direct.
 *
 * Локальная БД — источник правды для офлайн-работы. Pull тянет изменения
 * (в перспективе через сервис changes), push отправляет их в порядке
 * зависимостей: кампания → группа → объявление/ключевое слово.
 * Реальная логика наполняется командой /sync-engine.
 */
import type { AppDatabase } from '@db/connection'
import type { DirectApiClient } from '@direct-api/client'

export interface SyncSummary {
  pulled: number
  pushed: number
  conflicts: number
}

export class SyncEngine {
  constructor(
    private readonly db: AppDatabase,
    private readonly api: DirectApiClient
  ) {}

  /** Инкрементальный pull изменений с сервера в локальную БД. */
  async pull(): Promise<SyncSummary> {
    // TODO(/sync-engine): вызвать сервис changes, смапить и обновить локальные строки.
    void this.db
    void this.api
    return { pulled: 0, pushed: 0, conflicts: 0 }
  }

  /** Push локальных изменений на сервер в порядке зависимостей. */
  async push(): Promise<SyncSummary> {
    // TODO(/sync-engine): собрать new/modified/deleted, отправить, разобрать частичный успех.
    return { pulled: 0, pushed: 0, conflicts: 0 }
  }
}
