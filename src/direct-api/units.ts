import type { UnitsInfo } from './types/common';

/**
 * Разбирает заголовок `Units` из ответа Direct API.
 *
 * Формат — три целых через слэш: `потрачено/остаток/суточный-лимит`
 * (например `10/7995/8000`). Возвращает `null`, если заголовок отсутствует
 * или не распознан — вызывающий код не должен падать из-за этого.
 */
export function parseUnitsHeader(headerValue: string | null | undefined): UnitsInfo | null {
  if (!headerValue) return null;

  const parts = headerValue.split('/').map((p) => Number.parseInt(p.trim(), 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return null;
  }

  const [spent, rest, limit] = parts;
  return { spent, rest, limit };
}
