/**
 * Стабильный хеш снимка серверных полей — для детекта конфликтов.
 *
 * Чистая функция без зависимостей (не тянем node:crypto в core).
 * FNV-1a поверх канонической (с сортировкой ключей) JSON-строки.
 */

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`).join(',')}}`;
}

/** FNV-1a 32-bit → hex-строка. */
export function computeServerHash(serverFields: Record<string, unknown>): string {
  const str = canonicalStringify(serverFields);
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
