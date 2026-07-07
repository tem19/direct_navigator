import type { DirectApiClient } from '../client';
import { parseBulkResult, type BulkResult } from '../bulk';
import type { UnitsInfo } from '../types/common';
import type {
  KeywordBid,
  KeywordBidFieldName,
  KeywordBidSetItem,
  KeywordBidsGetResult,
  KeywordBidsSelectionCriteria,
  KeywordBidsSetResult,
} from '../types/keywordbids';

const SERVICE = 'keywordbids';

const DEFAULT_FIELDS: KeywordBidFieldName[] = ['KeywordId', 'AdGroupId', 'CampaignId', 'ServingStatus'];

/**
 * Сервис `keywordbids`: массовое управление ставками.
 * `set` применяет ставки пачкой на нужном уровне (фраза/группа/кампания) и
 * возвращает поэлементный результат.
 */
export class KeywordBidsService {
  constructor(private readonly client: DirectApiClient) {}

  /** Дочитывает все ставки по критериям (авто-пагинация). */
  async getAll(
    criteria: KeywordBidsSelectionCriteria = {},
    fieldNames: KeywordBidFieldName[] = DEFAULT_FIELDS,
  ): Promise<{ bids: KeywordBid[]; units: UnitsInfo | null }> {
    const { items, units } = await this.client.getAll<KeywordBidsGetResult, KeywordBid>(
      SERVICE,
      {
        SelectionCriteria: criteria,
        FieldNames: fieldNames,
        SearchFieldNames: ['Bid'],
        NetworkFieldNames: ['Bid'],
      },
      (r) => r.KeywordBids,
    );
    return { bids: items, units };
  }

  /** Устанавливает ставки пачкой; возвращает поэлементный результат. */
  async set(bids: KeywordBidSetItem[]): Promise<BulkResult<KeywordBidSetItem>> {
    const { result } = await this.client.request<KeywordBidsSetResult>(SERVICE, 'set', {
      KeywordBids: bids,
    });
    return parseBulkResult(result.SetResults, bids);
  }
}
