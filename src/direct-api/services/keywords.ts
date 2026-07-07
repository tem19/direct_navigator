import type { DirectApiClient } from '../client';
import { parseBulkResult, type BulkResult } from '../bulk';
import type { UnitsInfo } from '../types/common';
import type {
  Keyword,
  KeywordAddItem,
  KeywordFieldName,
  KeywordUpdateItem,
  KeywordsActionResult,
  KeywordsAddResult,
  KeywordsDeleteResult,
  KeywordsGetResult,
  KeywordsSelectionCriteria,
  KeywordsUpdateResult,
} from '../types/keywords';

const SERVICE = 'keywords';

const DEFAULT_FIELDS: KeywordFieldName[] = [
  'Id',
  'Keyword',
  'AdGroupId',
  'CampaignId',
  'Status',
  'State',
  'Bid',
];

/**
 * Сервис `keywords`: get/add/update/delete + suspend/resume.
 * Ставки меняются через `update` (Bid/ContextBid) либо отдельный сервис
 * `keywordbids` — здесь базовые операции над самими фразами.
 */
export class KeywordsService {
  constructor(private readonly client: DirectApiClient) {}

  /** Дочитывает все ключевые фразы по критериям (авто-пагинация). */
  async getAll(
    criteria: KeywordsSelectionCriteria = {},
    fieldNames: KeywordFieldName[] = DEFAULT_FIELDS,
  ): Promise<{ keywords: Keyword[]; units: UnitsInfo | null }> {
    const { items, units } = await this.client.getAll<KeywordsGetResult, Keyword>(
      SERVICE,
      { SelectionCriteria: criteria, FieldNames: fieldNames },
      (r) => r.Keywords,
    );
    return { keywords: items, units };
  }

  async add(keywords: KeywordAddItem[]): Promise<BulkResult<KeywordAddItem>> {
    const { result } = await this.client.request<KeywordsAddResult>(SERVICE, 'add', {
      Keywords: keywords,
    });
    return parseBulkResult(result.AddResults, keywords);
  }

  async update(keywords: KeywordUpdateItem[]): Promise<BulkResult<KeywordUpdateItem>> {
    const { result } = await this.client.request<KeywordsUpdateResult>(SERVICE, 'update', {
      Keywords: keywords,
    });
    return parseBulkResult(result.UpdateResults, keywords);
  }

  async delete(ids: number[]): Promise<BulkResult<number>> {
    const { result } = await this.client.request<KeywordsDeleteResult>(SERVICE, 'delete', {
      SelectionCriteria: { Ids: ids },
    });
    return parseBulkResult(result.DeleteResults, ids);
  }

  suspend(ids: number[]): Promise<BulkResult<number>> {
    return this.action('suspend', ids);
  }

  resume(ids: number[]): Promise<BulkResult<number>> {
    return this.action('resume', ids);
  }

  private async action(method: string, ids: number[]): Promise<BulkResult<number>> {
    const { result } = await this.client.request<KeywordsActionResult>(SERVICE, method, {
      SelectionCriteria: { Ids: ids },
    });
    return parseBulkResult(result.ActionResults, ids);
  }
}
