/**
 * Сервис `dictionaries` — справочники Директа (регионы, валюты, часовые пояса
 * и т.п.). Только чтение; используется для валидации и подсказок в UI.
 */

/** Имена справочников, доступные в `DictionaryNames`. */
export type DictionaryName =
  | 'GeoRegions'
  | 'GeoPyramids'
  | 'Currencies'
  | 'TimeZones'
  | 'Constants'
  | 'AdCategories'
  | 'Interests'
  | 'MetroStations'
  | 'SupplySidePlatforms';

/** Регион показов. */
export interface GeoRegion {
  GeoRegionId: number;
  GeoRegionName: string;
  GeoRegionType: string;
  ParentId?: number;
}

/** Валюта. */
export interface Currency {
  Currency: string;
  MinPrice?: number;
  MaxPrice?: number;
}

/**
 * Ответ `dictionaries.get`. Ключи соответствуют запрошенным именам справочников;
 * типизированы известные, остальные — через индексную сигнатуру.
 */
export interface DictionariesGetResult {
  GeoRegions?: GeoRegion[];
  Currencies?: Currency[];
  [dictionary: string]: unknown;
}
