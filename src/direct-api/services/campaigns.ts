import type { DirectClient } from '../client';
import { parseBulkResult, type BulkResult } from '../bulk-result';
import type {
  CampaignAddItem,
  CampaignGetItem,
  CampaignsAddResult,
  CampaignsDeleteResult,
  CampaignsGetResult,
  CampaignsUpdateResult,
  CampaignUpdateItem,
} from '../types/campaigns';

const SERVICE = 'campaigns';

/** Сервисная обёртка над campaigns. Возвращает разобранные результаты. */
export class CampaignsService {
  constructor(private readonly client: DirectClient) {}

  /** Все кампании с авто-пагинацией. */
  async getAll(
    fieldNames: string[] = ['Id', 'Name', 'Status', 'State'],
  ): Promise<CampaignGetItem[]> {
    return this.client.getAll<CampaignGetItem, CampaignsGetResult>(
      SERVICE,
      { SelectionCriteria: {}, FieldNames: fieldNames },
      (r) => r.Campaigns,
    );
  }

  /** Кампании по конкретным ID (для инкрементального pull через changes). */
  async getByIds(
    ids: number[],
    fieldNames: string[] = ['Id', 'Name', 'Status', 'State'],
  ): Promise<CampaignGetItem[]> {
    if (ids.length === 0) return [];
    return this.client.getAll<CampaignGetItem, CampaignsGetResult>(
      SERVICE,
      { SelectionCriteria: { Ids: ids }, FieldNames: fieldNames },
      (r) => r.Campaigns,
    );
  }

  /** Добавление пачкой с разбором поэлементного результата. */
  async add(campaigns: CampaignAddItem[]): Promise<BulkResult<CampaignAddItem>> {
    const result = await this.client.call<CampaignsAddResult>(SERVICE, 'add', {
      Campaigns: campaigns,
    });
    return parseBulkResult(campaigns, result.AddResults ?? []);
  }

  async update(
    campaigns: CampaignUpdateItem[],
  ): Promise<BulkResult<CampaignUpdateItem>> {
    const result = await this.client.call<CampaignsUpdateResult>(SERVICE, 'update', {
      Campaigns: campaigns,
    });
    return parseBulkResult(campaigns, result.UpdateResults ?? []);
  }

  async delete(ids: number[]): Promise<BulkResult<number>> {
    const result = await this.client.call<CampaignsDeleteResult>(SERVICE, 'delete', {
      SelectionCriteria: { Ids: ids },
    });
    return parseBulkResult(ids, result.DeleteResults ?? []);
  }
}
