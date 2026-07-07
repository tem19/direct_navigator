import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openInMemoryDatabase, type AppDatabase } from '@db/connection'

describe('CampaignRepository', () => {
  let db: AppDatabase

  beforeEach(() => {
    db = openInMemoryDatabase()
  })

  afterEach(() => {
    db.close()
  })

  it('создаёт и читает кампанию со статусом new', () => {
    const created = db.campaigns.create({ name: 'Тест', dailyBudget: 500 })
    expect(created.localId).toBeGreaterThan(0)
    expect(created.syncStatus).toBe('new')
    expect(created.directId).toBeNull()

    const all = db.campaigns.list()
    expect(all).toHaveLength(1)
    expect(all[0]?.name).toBe('Тест')
    expect(all[0]?.dailyBudget).toBe(500)
  })

  it('возвращает пустой список на свежей БД', () => {
    expect(db.campaigns.list()).toEqual([])
  })
})
