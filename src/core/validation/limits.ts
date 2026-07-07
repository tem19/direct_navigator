/**
 * Лимиты Яндекс Директа для базовых сущностей.
 * Значения соответствуют ограничениям API v5 (текстовые объявления).
 */
export const DIRECT_LIMITS = {
  campaign: {
    nameMaxLen: 255,
  },
  adGroup: {
    nameMaxLen: 255,
    maxRegions: 10000,
  },
  ad: {
    titleMaxLen: 56, // Title
    title2MaxLen: 30, // Title2
    textMaxLen: 81, // Text
    displayUrlPathMaxLen: 20,
  },
  keyword: {
    // Директ: до 4096 символов и до 7 слов без учёта минус-слов/стоп-слов.
    maxLen: 4096,
    maxWords: 7,
  },
  /** Ставки задаются в микро-единицах: 1_000_000 = 1 у.е. */
  bid: {
    minMicros: 300_000, // 0.30 у.е. — минимальная ставка
    maxMicros: 25_000_000_000, // 25000 у.е.
  },
} as const;
