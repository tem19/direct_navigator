import { describe, it, expect } from 'vitest'
import { validateCampaign } from '@core/validation'

describe('validateCampaign', () => {
  it('принимает корректную кампанию', () => {
    const result = validateCampaign({ name: 'Летняя распродажа', dailyBudget: 1000 })
    expect(result.ok).toBe(true)
  })

  it('отклоняет пустое название', () => {
    const result = validateCampaign({ name: '   ', dailyBudget: null })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === 'name')).toBe(true)
    }
  })

  it('отклоняет отрицательный бюджет', () => {
    const result = validateCampaign({ name: 'Кампания', dailyBudget: -5 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === 'dailyBudget')).toBe(true)
    }
  })
})
