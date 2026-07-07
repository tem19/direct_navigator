/**
 * Публичный API клиента Yandex Direct API v5.
 *
 * Пример использования (main-процесс, токен из safeStorage):
 *
 * ```ts
 * import { DirectApiClient, CampaignsService } from '@/direct-api';
 *
 * const client = new DirectApiClient({
 *   // baseUrl не задан → берётся из env (по умолчанию sandbox)
 *   getToken: async () => decryptTokenFromKeychain(),
 *   clientLogin: process.env.DIRECT_API_CLIENT_LOGIN,
 * });
 *
 * client.onUnits((u) => console.log('Баллы: остаток', u.rest, 'из', u.limit));
 *
 * const campaigns = new CampaignsService(client);
 * const { campaigns: list } = await campaigns.getAll({ States: ['ON'] });
 *
 * const res = await campaigns.add([{ Name: 'Тест', StartDate: '2026-07-08', TextCampaign: {} }]);
 * if (res.hasErrors) {
 *   for (const f of res.failed) console.error(f.index, f.errors);
 * }
 * ```
 */
export { DirectApiClient } from './client';
export type { ApiCallResult, UnitsListener } from './client';

export { CampaignsService } from './services/campaigns';
export { AdGroupsService } from './services/adgroups';
export { AdsService } from './services/ads';
export { KeywordsService } from './services/keywords';
export { KeywordBidsService } from './services/keywordbids';
export { ChangesService } from './services/changes';
export { DictionariesService } from './services/dictionaries';

export {
  DIRECT_BASE_URL,
  resolveBaseUrl,
  resolveConfig,
} from './config';
export type { DirectClientConfig, DirectClientOptions, TokenProvider } from './config';

export { DirectApiError, DirectTransportError, DirectErrorCode } from './errors';

export { parseBulkResult } from './bulk';
export type { BulkResult, BulkSuccess, BulkFailure, BulkReason } from './bulk';

export { parseUnitsHeader } from './units';

export type * from './types/common';
export type * from './types/campaigns';
export type * from './types/adgroups';
export type * from './types/ads';
export type * from './types/keywords';
export type * from './types/keywordbids';
export type * from './types/changes';
export type * from './types/dictionaries';
