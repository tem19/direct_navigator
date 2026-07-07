import type { SyncMeta } from './common';

export type AdType = 'TEXT_AD' | 'MOBILE_APP_AD' | 'DYNAMIC_TEXT_AD';

export const AD_TYPES: readonly AdType[] = ['TEXT_AD', 'MOBILE_APP_AD', 'DYNAMIC_TEXT_AD'] as const;

export type AdStatus = 'ACCEPTED' | 'DRAFT' | 'MODERATION' | 'PREACCEPTED' | 'REJECTED';

export interface Ad extends SyncMeta {
  adGroupLocalId: number;
  type: AdType;
  status: AdStatus;
  /** Заголовок 1 (Title). */
  title: string;
  /** Заголовок 2 (Title2), опционально. */
  title2: string | null;
  /** Текст объявления (Text). */
  text: string;
  /** Отображаемая ссылка / href. */
  href: string | null;
  /** Отображаемый URL (display path). */
  displayUrlPath: string | null;
}

export interface NewAd {
  directId?: number | null;
  adGroupLocalId: number;
  type: AdType;
  status?: AdStatus;
  title: string;
  title2?: string | null;
  text: string;
  href?: string | null;
  displayUrlPath?: string | null;
}
