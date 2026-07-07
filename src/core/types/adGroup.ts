import type { SyncMeta } from './common';

export type AdGroupType =
  | 'TEXT_AD_GROUP'
  | 'MOBILE_APP_AD_GROUP'
  | 'DYNAMIC_TEXT_AD_GROUP'
  | 'SMART_AD_GROUP';

export const AD_GROUP_TYPES: readonly AdGroupType[] = [
  'TEXT_AD_GROUP',
  'MOBILE_APP_AD_GROUP',
  'DYNAMIC_TEXT_AD_GROUP',
  'SMART_AD_GROUP',
] as const;

export type AdGroupStatus = 'ACCEPTED' | 'DRAFT' | 'MODERATION' | 'PREACCEPTED' | 'REJECTED';

export interface AdGroup extends SyncMeta {
  campaignLocalId: number;
  name: string;
  type: AdGroupType;
  status: AdGroupStatus;
  /** Гео (список geo id) — сериализовано в БД, в домене — массив. */
  regionIds: number[];
}

export interface NewAdGroup {
  directId?: number | null;
  campaignLocalId: number;
  name: string;
  type: AdGroupType;
  status?: AdGroupStatus;
  regionIds?: number[];
}
