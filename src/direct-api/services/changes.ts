import type { DirectApiClient } from '../client';
import type { UnitsInfo } from '../types/common';
import type {
  ChangesCheckParams,
  ChangesCheckResult,
  ChangesFieldName,
  CheckCampaignsResult,
} from '../types/changes';

const SERVICE = 'changes';

/**
 * Сервис `changes`: инкрементальная проверка изменений для pull-синхронизации.
 * Ответы приходят целиком (без пагинации), баллы отдаются наружу.
 */
export class ChangesService {
  constructor(private readonly client: DirectApiClient) {}

  /**
   * `checkCampaigns` — какие кампании изменились с момента `since`.
   * Первый вызов — без `since`: вернёт текущий серверный timestamp, который
   * нужно сохранить и передавать в последующие инкрементальные проверки.
   */
  async checkCampaigns(
    since?: string,
  ): Promise<{ result: CheckCampaignsResult; units: UnitsInfo | null }> {
    const params = since ? { Timestamp: since } : {};
    const { result, units } = await this.client.request<CheckCampaignsResult>(
      SERVICE,
      'checkCampaigns',
      params,
    );
    return { result, units };
  }

  /**
   * `check` — детальная проверка изменений по конкретным Id и типам сущностей.
   * @param since       Точка отсчёта (RFC3339, UTC) — из предыдущего ответа.
   * @param fieldNames  Что интересует: CampaignIds / AdGroupIds / AdIds.
   * @param scope       Ограничение по Id (по умолчанию — весь аккаунт).
   */
  async check(
    since: string,
    fieldNames: ChangesFieldName[],
    scope: Pick<ChangesCheckParams, 'CampaignIds' | 'AdGroupIds' | 'AdIds'> = {},
  ): Promise<{ result: ChangesCheckResult; units: UnitsInfo | null }> {
    const params: ChangesCheckParams = {
      ...scope,
      Timestamp: since,
      FieldNames: fieldNames,
    };
    const { result, units } = await this.client.request<ChangesCheckResult>(
      SERVICE,
      'check',
      params,
    );
    return { result, units };
  }
}
