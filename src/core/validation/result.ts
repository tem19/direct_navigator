export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export function ok(): ValidationResult {
  return { ok: true, issues: [] };
}

export function fail(issues: ValidationIssue[]): ValidationResult {
  return { ok: issues.length === 0, issues };
}

export class ValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super(`Validation failed: ${issues.map((i) => `${i.field}: ${i.message}`).join('; ')}`);
    this.name = 'ValidationError';
  }
}

/** Собрать результат из накопленных проблем. */
export function collect(issues: ValidationIssue[]): ValidationResult {
  return { ok: issues.length === 0, issues };
}
