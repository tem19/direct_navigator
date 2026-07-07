import type { DirectApiClient } from '../client';
import type { UnitsInfo } from '../types/common';
import type {
  DictionariesGetResult,
  DictionaryName,
  GeoRegion,
} from '../types/dictionaries';

const SERVICE = 'dictionaries';

/**
 * Сервис `dictionaries`: чтение справочников Директа. Без пагинации —
 * справочник возвращается целиком.
 */
export class DictionariesService {
  constructor(private readonly client: DirectApiClient) {}

  /** Возвращает запрошенные справочники одним ответом. */
  async get(
    names: DictionaryName[],
  ): Promise<{ result: DictionariesGetResult; units: UnitsInfo | null }> {
    const { result, units } = await this.client.request<DictionariesGetResult>(SERVICE, 'get', {
      DictionaryNames: names,
    });
    return { result, units };
  }

  /** Удобный хелпер: справочник регионов показов. */
  async geoRegions(): Promise<{ regions: GeoRegion[]; units: UnitsInfo | null }> {
    const { result, units } = await this.get(['GeoRegions']);
    return { regions: result.GeoRegions ?? [], units };
  }
}
