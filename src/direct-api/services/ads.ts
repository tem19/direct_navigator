import type { DirectApiClient } from '../client';
import { parseBulkResult, type BulkResult } from '../bulk';
import type { UnitsInfo } from '../types/common';
import type {
  Ad,
  AdAddItem,
  AdFieldName,
  AdUpdateItem,
  AdsActionResult,
  AdsAddResult,
  AdsDeleteResult,
  AdsGetResult,
  AdsSelectionCriteria,
  AdsUpdateResult,
  TextAdFieldName,
} from '../types/ads';

const SERVICE = 'ads';

const DEFAULT_FIELDS: AdFieldName[] = ['Id', 'AdGroupId', 'CampaignId', 'Type', 'Status', 'State'];
const DEFAULT_TEXT_FIELDS: TextAdFieldName[] = ['Title', 'Title2', 'Text', 'Href'];

/**
 * Сервис `ads`: get/add/update/delete + статусные операции
 * (suspend/resume/archive/unarchive/moderate).
 */
export class AdsService {
  constructor(private readonly client: DirectApiClient) {}

  /** Дочитывает все объявления по критериям (авто-пагинация). */
  async getAll(
    criteria: AdsSelectionCriteria = {},
    fieldNames: AdFieldName[] = DEFAULT_FIELDS,
    textAdFieldNames: TextAdFieldName[] = DEFAULT_TEXT_FIELDS,
  ): Promise<{ ads: Ad[]; units: UnitsInfo | null }> {
    const { items, units } = await this.client.getAll<AdsGetResult, Ad>(
      SERVICE,
      {
        SelectionCriteria: criteria,
        FieldNames: fieldNames,
        TextAdFieldNames: textAdFieldNames,
      },
      (r) => r.Ads,
    );
    return { ads: items, units };
  }

  async add(ads: AdAddItem[]): Promise<BulkResult<AdAddItem>> {
    const { result } = await this.client.request<AdsAddResult>(SERVICE, 'add', { Ads: ads });
    return parseBulkResult(result.AddResults, ads);
  }

  async update(ads: AdUpdateItem[]): Promise<BulkResult<AdUpdateItem>> {
    const { result } = await this.client.request<AdsUpdateResult>(SERVICE, 'update', { Ads: ads });
    return parseBulkResult(result.UpdateResults, ads);
  }

  async delete(ids: number[]): Promise<BulkResult<number>> {
    const { result } = await this.client.request<AdsDeleteResult>(SERVICE, 'delete', {
      SelectionCriteria: { Ids: ids },
    });
    return parseBulkResult(result.DeleteResults, ids);
  }

  /** Отправляет объявления на модерацию. */
  moderate(ids: number[]): Promise<BulkResult<number>> {
    return this.action('moderate', ids);
  }

  suspend(ids: number[]): Promise<BulkResult<number>> {
    return this.action('suspend', ids);
  }

  resume(ids: number[]): Promise<BulkResult<number>> {
    return this.action('resume', ids);
  }

  archive(ids: number[]): Promise<BulkResult<number>> {
    return this.action('archive', ids);
  }

  unarchive(ids: number[]): Promise<BulkResult<number>> {
    return this.action('unarchive', ids);
  }

  private async action(method: string, ids: number[]): Promise<BulkResult<number>> {
    const { result } = await this.client.request<AdsActionResult>(SERVICE, method, {
      SelectionCriteria: { Ids: ids },
    });
    return parseBulkResult(result.ActionResults, ids);
  }
}
