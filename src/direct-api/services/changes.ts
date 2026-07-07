import type { DirectClient } from '../client';
import type { CheckResult } from '../types/changes';

const SERVICE = 'changes';

/**
 * Сервис changes: узнаёт, какие объекты изменились с прошлой синхронизации,
 * чтобы не выкачивать всё заново и экономить баллы.
 */
export class ChangesService {
  constructor(private readonly client: DirectClient) {}

  /**
   * Проверка изменений по кампаниям с момента timestamp.
   * @returns список изменённых CampaignIds + новый Timestamp; при первичной
   *          загрузке (timestamp пуст) сервер вернёт ForceRefresh=YES.
   */
  async checkCampaigns(timestamp?: string): Promise<CheckResult> {
    return this.client.call<CheckResult>(SERVICE, 'check', {
      ...(timestamp ? { Timestamp: timestamp } : {}),
      FieldNames: ['CampaignIds'],
    });
  }
}
