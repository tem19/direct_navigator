import { createHash } from 'node:crypto';
import type { FieldDiff } from './types';

/**
 * Стабильный хэш серверных полей для детекта конфликтов. Ключи сортируются,
 * чтобы порядок не влиял на результат.
 */
export function serverHash(fields: Record<string, unknown>): string {
  return createHash('sha1').update(stableStringify(fields)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/** Список расхождений по полям между локальной и серверной версиями. */
export function diffFields(
  local: Record<string, unknown>,
  server: Record<string, unknown>,
): FieldDiff[] {
  const keys = new Set([...Object.keys(local), ...Object.keys(server)]);
  const diffs: FieldDiff[] = [];
  for (const field of keys) {
    if (stableStringify(local[field]) !== stableStringify(server[field])) {
      diffs.push({ field, local: local[field], server: server[field] });
    }
  }
  return diffs;
}
