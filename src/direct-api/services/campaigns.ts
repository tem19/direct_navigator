import type { DirectApiClient } from '../client';
import { parseBulkResult, type BulkResult } from '../bulk';
import type { UnitsInfo } from '../types/common';
import type {
  Campaign,
  CampaignAddItem,
  CampaignFieldName,
  CampaignUpdateItem,
  CampaignsAddResult,
  CampaignsActionResult,
  CampaignsDeleteResult,
  CampaignsGetResult,
  CampaignsSelectionCriteria,
  CampaignsUpdateResult,
} from '../types/campaigns';

const SERVICE = 'campaigns';

const DEFAULT_FIELDS: CampaignFieldName[] = [
  'Id',
  'Name',
  'Type',
  'Status',
  'State',
  'StatusShow',
];

/**
 * Сервис `campaigns`: тонкие типизированные обёртки над транспортом.
 * `get*` — с авто-пагинацией; `add/update/delete/`статусные — с разбором
 * поэлементного результата в `BulkResult`.
 */
export class CampaignsService {
  constructor(private readonly client: DirectApiClient) {}

  /** Дочитывает все кампании по критериям (авто-пагинация). */
  async getAll(
    criteria: CampaignsSelectionCriteria = {},
    fieldNames: CampaignFieldName[] = DEFAULT_FIELDS,
  ): Promise<{ campaigns: Campaign[]; units: UnitsInfo | null }> {
    const { items, units } = await this.client.getAll<CampaignsGetResult, Campaign>(
      SERVICE,
      { SelectionCriteria: criteria, FieldNames: fieldNames },
      (r) => r.Campaigns,
    );
    return { campaigns: items, units };
  }

  /** Добавляет кампании; возвращает поэлементный результат с новыми Id. */
  async add(campaigns: CampaignAddItem[]): Promise<BulkResult<CampaignAddItem>> {
    const { result } = await this.client.request<CampaignsAddResult>(SERVICE, 'add', {
      Campaigns: campaigns,
    });
    return parseBulkResult(result.AddResults, campaigns);
  }

  /** Обновляет кампании; возвращает поэлементный результат. */
  async update(campaigns: CampaignUpdateItem[]): Promise<BulkResult<CampaignUpdateItem>> {
    const { result } = await this.client.request<CampaignsUpdateResult>(SERVICE, 'update', {
      Campaigns: campaigns,
    });
    return parseBulkResult(result.UpdateResults, campaigns);
  }

  /** Удаляет кампании по Id; возвращает поэлементный результат. */
  async delete(ids: number[]): Promise<BulkResult<number>> {
    const { result } = await this.client.request<CampaignsDeleteResult>(SERVICE, 'delete', {
      SelectionCriteria: { Ids: ids },
    });
    return parseBulkResult(result.DeleteResults, ids);
  }

  /** Останавливает показы кампаний. */
  suspend(ids: number[]): Promise<BulkResult<number>> {
    return this.action('suspend', ids);
  }

  /** Возобновляет показы кампаний. */
  resume(ids: number[]): Promise<BulkResult<number>> {
    return this.action('resume', ids);
  }

  /** Архивирует кампании. */
  archive(ids: number[]): Promise<BulkResult<number>> {
    return this.action('archive', ids);
  }

  /** Разархивирует кампании. */
  unarchive(ids: number[]): Promise<BulkResult<number>> {
    return this.action('unarchive', ids);
  }

  /** Общий обработчик статусных методов (по списку Id). */
  private async action(method: string, ids: number[]): Promise<BulkResult<number>> {
    const { result } = await this.client.request<CampaignsActionResult>(SERVICE, method, {
      SelectionCriteria: { Ids: ids },
    });
    return parseBulkResult(result.ActionResults, ids);
  }
}
