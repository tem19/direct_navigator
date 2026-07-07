import type { DirectClient } from '../client';
import { parseBulkResult, type BulkResult } from '../bulk-result';
import type {
  CampaignAddItem,
  CampaignGetItem,
  CampaignsAddResult,
  CampaignsGetResult,
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

  /** Добавление пачкой с разбором поэлементного результата. */
  async add(campaigns: CampaignAddItem[]): Promise<BulkResult<CampaignAddItem>> {
    const result = await this.client.call<CampaignsAddResult>(SERVICE, 'add', {
      Campaigns: campaigns,
    });
    return parseBulkResult(campaigns, result.AddResults ?? []);
  }
}
