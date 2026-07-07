import type { DirectApiClient } from '../client';
import { parseBulkResult, type BulkResult } from '../bulk';
import type { UnitsInfo } from '../types/common';
import type {
  VCard,
  VCardAddItem,
  VCardFieldName,
  VCardsAddResult,
  VCardsDeleteResult,
  VCardsGetResult,
  VCardsSelectionCriteria,
} from '../types/vcards';

const SERVICE = 'vcards';

const DEFAULT_FIELDS: VCardFieldName[] = ['Id', 'CampaignId', 'Company', 'Phone', 'City'];

/**
 * Сервис `vcards`: визитки (контактная информация). Неизменяемы — только
 * get/add/delete.
 */
export class VCardsService {
  constructor(private readonly client: DirectApiClient) {}

  /** Дочитывает все визитки по критериям (авто-пагинация). */
  async getAll(
    criteria: VCardsSelectionCriteria = {},
    fieldNames: VCardFieldName[] = DEFAULT_FIELDS,
  ): Promise<{ vcards: VCard[]; units: UnitsInfo | null }> {
    const { items, units } = await this.client.getAll<VCardsGetResult, VCard>(
      SERVICE,
      { SelectionCriteria: criteria, FieldNames: fieldNames },
      (r) => r.VCards,
    );
    return { vcards: items, units };
  }

  async add(vcards: VCardAddItem[]): Promise<BulkResult<VCardAddItem>> {
    const { result } = await this.client.request<VCardsAddResult>(SERVICE, 'add', {
      VCards: vcards,
    });
    return parseBulkResult(result.AddResults, vcards);
  }

  async delete(ids: number[]): Promise<BulkResult<number>> {
    const { result } = await this.client.request<VCardsDeleteResult>(SERVICE, 'delete', {
      SelectionCriteria: { Ids: ids },
    });
    return parseBulkResult(result.DeleteResults, ids);
  }
}
