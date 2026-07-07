/** Типы сервиса changes (инкрементальная синхронизация). */

/** Что изменилось с момента Timestamp. */
export interface CheckResult {
  /** Метка времени для следующего запроса changes. */
  Timestamp: string;
  /** Нужна ли полная перезагрузка (сервер не может отдать инкремент). */
  Modified?: {
    CampaignIds?: number[];
    AdGroupIds?: number[];
    AdIds?: number[];
    /** true, если изменения слишком масштабны — тянуть всё заново. */
    NotFound?: unknown;
  };
  /** Сервер требует полную перезагрузку. */
  ForceRefresh?: 'YES' | 'NO';
}

export interface CheckCampaignsParams {
  /** ISO-8601 метка последней синхронизации. Опустить для первичной загрузки. */
  Timestamp?: string;
  FieldNames: Array<'CampaignIds'>;
}
