/**
 * Стабильный хэш строки (djb2). Без внешних зависимостей и node:crypto —
 * чтобы core оставался чистым. Достаточно для детекта изменений серверного
 * снимка (не криптостойкость).
 */
export function stableHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  // >>> 0 — привести к беззнаковому 32-битному, затем в hex.
  return (hash >>> 0).toString(16);
}

/**
 * Хэширует набор серверных полей стабильно (порядок ключей фиксируется
 * сортировкой), чтобы сравнивать снимки независимо от порядка сериализации.
 */
export function hashServerSnapshot(fields: Record<string, unknown>): string {
  const sorted = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${JSON.stringify(fields[k])}`)
    .join('|');
  return stableHash(sorted);
}
