/**
 * Сервис `changes` — инкрементальная проверка изменений для pull-синхронизации.
 * Не тратит баллы на выгрузку всего; сначала спрашиваем, что поменялось,
 * потом дочитываем детали через профильные сервисы.
 */

/** Что проверять в методе `check` (`FieldNames`). */
export type ChangesFieldName = 'CampaignIds' | 'AdGroupIds' | 'AdIds';

/** Поля результата `checkCampaigns`. */
export interface CheckCampaignsParams {
  /** Момент времени (RFC3339, UTC), с которого искать изменения. */
  Timestamp?: string;
}

export interface CampaignChange {
  CampaignId: number;
  ChangesInCampaign?: string;
  SelfStatus?: string;
}

export interface CheckCampaignsResult {
  Campaigns: CampaignChange[];
  /** Новый timestamp — передать в следующий вызов. */
  Timestamp: string;
}

export interface ChangesCheckParams {
  CampaignIds?: number[];
  AdGroupIds?: number[];
  AdIds?: number[];
  /** Обязателен: точка отсчёта (RFC3339, UTC). */
  Timestamp: string;
  FieldNames: ChangesFieldName[];
}

/** Набор изменившихся Id по типам сущностей. */
export interface ChangedIds {
  CampaignIds?: number[];
  AdGroupIds?: number[];
  AdIds?: number[];
}

export interface ChangesCheckResult {
  /** Изменённые/новые объекты. */
  Modified?: ChangedIds;
  /** Удалённые объекты. */
  Deleted?: ChangedIds;
  /** Объекты, которых больше нет в аккаунте. */
  NotFound?: ChangedIds;
  /** Новый timestamp для следующего инкремента. */
  Timestamp: string;
}
