/**
 * Базовая доменная валидация. Без зависимостей от Electron/SQL/UI —
 * может использоваться и в main, и в renderer.
 */
import type { Campaign } from './types'

export interface ValidationIssue {
  field: string
  message: string
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; issues: ValidationIssue[] }

const CAMPAIGN_NAME_MAX = 255

export function validateCampaignName(name: string): ValidationIssue | null {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return { field: 'name', message: 'Название кампании не может быть пустым' }
  }
  if (trimmed.length > CAMPAIGN_NAME_MAX) {
    return { field: 'name', message: `Название длиннее ${CAMPAIGN_NAME_MAX} символов` }
  }
  return null
}

export function validateDailyBudget(budget: number | null): ValidationIssue | null {
  if (budget === null) return null
  if (!Number.isFinite(budget) || budget < 0) {
    return { field: 'dailyBudget', message: 'Дневной бюджет должен быть неотрицательным числом' }
  }
  return null
}

export function validateCampaign(input: Pick<Campaign, 'name' | 'dailyBudget'>): ValidationResult {
  const issues: ValidationIssue[] = []
  const nameIssue = validateCampaignName(input.name)
  if (nameIssue) issues.push(nameIssue)
  const budgetIssue = validateDailyBudget(input.dailyBudget)
  if (budgetIssue) issues.push(budgetIssue)
  return issues.length === 0 ? { ok: true } : { ok: false, issues }
}
