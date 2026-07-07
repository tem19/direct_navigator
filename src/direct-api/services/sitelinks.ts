import type { DirectApiClient } from '../client';
import { parseBulkResult, type BulkResult } from '../bulk';
import type { UnitsInfo } from '../types/common';
import type {
  SitelinkFieldName,
  SitelinksAddResult,
  SitelinksDeleteResult,
  SitelinksGetResult,
  SitelinksSelectionCriteria,
  SitelinksSet,
  SitelinksSetAddItem,
  SitelinksSetFieldName,
} from '../types/sitelinks';

const SERVICE = 'sitelinks';

const DEFAULT_FIELDS: SitelinksSetFieldName[] = ['Id', 'Sitelinks'];
const DEFAULT_SITELINK_FIELDS: SitelinkFieldName[] = ['Title', 'Href', 'Description'];

/**
 * Сервис `sitelinks`: наборы быстрых ссылок. Неизменяемы — только
 * get/add/delete (правка = создать новый набор и переназначить).
 */
export class SitelinksService {
  constructor(private readonly client: DirectApiClient) {}

  /** Дочитывает все наборы быстрых ссылок (авто-пагинация). */
  async getAll(
    criteria: SitelinksSelectionCriteria = {},
    fieldNames: SitelinksSetFieldName[] = DEFAULT_FIELDS,
    sitelinkFieldNames: SitelinkFieldName[] = DEFAULT_SITELINK_FIELDS,
  ): Promise<{ sets: SitelinksSet[]; units: UnitsInfo | null }> {
    const { items, units } = await this.client.getAll<SitelinksGetResult, SitelinksSet>(
      SERVICE,
      {
        SelectionCriteria: criteria,
        FieldNames: fieldNames,
        SitelinkFieldNames: sitelinkFieldNames,
      },
      (r) => r.SitelinksSets,
    );
    return { sets: items, units };
  }

  async add(sets: SitelinksSetAddItem[]): Promise<BulkResult<SitelinksSetAddItem>> {
    const { result } = await this.client.request<SitelinksAddResult>(SERVICE, 'add', {
      SitelinksSets: sets,
    });
    return parseBulkResult(result.AddResults, sets);
  }

  async delete(ids: number[]): Promise<BulkResult<number>> {
    const { result } = await this.client.request<SitelinksDeleteResult>(SERVICE, 'delete', {
      SelectionCriteria: { Ids: ids },
    });
    return parseBulkResult(result.DeleteResults, ids);
  }
}
