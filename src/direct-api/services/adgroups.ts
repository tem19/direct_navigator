import type { DirectApiClient } from '../client';
import { parseBulkResult, type BulkResult } from '../bulk';
import type { UnitsInfo } from '../types/common';
import type {
  AdGroup,
  AdGroupAddItem,
  AdGroupFieldName,
  AdGroupUpdateItem,
  AdGroupsAddResult,
  AdGroupsDeleteResult,
  AdGroupsGetResult,
  AdGroupsSelectionCriteria,
  AdGroupsUpdateResult,
} from '../types/adgroups';

const SERVICE = 'adgroups';

const DEFAULT_FIELDS: AdGroupFieldName[] = ['Id', 'Name', 'CampaignId', 'Type', 'Status'];

/**
 * Сервис `adgroups`. У групп нет статусных методов (suspend/archive) — они
 * управляются на уровне кампаний/объявлений; здесь get/add/update/delete.
 */
export class AdGroupsService {
  constructor(private readonly client: DirectApiClient) {}

  /** Дочитывает все группы по критериям (авто-пагинация). */
  async getAll(
    criteria: AdGroupsSelectionCriteria = {},
    fieldNames: AdGroupFieldName[] = DEFAULT_FIELDS,
  ): Promise<{ adGroups: AdGroup[]; units: UnitsInfo | null }> {
    const { items, units } = await this.client.getAll<AdGroupsGetResult, AdGroup>(
      SERVICE,
      { SelectionCriteria: criteria, FieldNames: fieldNames },
      (r) => r.AdGroups,
    );
    return { adGroups: items, units };
  }

  async add(adGroups: AdGroupAddItem[]): Promise<BulkResult<AdGroupAddItem>> {
    const { result } = await this.client.request<AdGroupsAddResult>(SERVICE, 'add', {
      AdGroups: adGroups,
    });
    return parseBulkResult(result.AddResults, adGroups);
  }

  async update(adGroups: AdGroupUpdateItem[]): Promise<BulkResult<AdGroupUpdateItem>> {
    const { result } = await this.client.request<AdGroupsUpdateResult>(SERVICE, 'update', {
      AdGroups: adGroups,
    });
    return parseBulkResult(result.UpdateResults, adGroups);
  }

  async delete(ids: number[]): Promise<BulkResult<number>> {
    const { result } = await this.client.request<AdGroupsDeleteResult>(SERVICE, 'delete', {
      SelectionCriteria: { Ids: ids },
    });
    return parseBulkResult(result.DeleteResults, ids);
  }
}
