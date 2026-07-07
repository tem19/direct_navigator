import type { SyncMeta } from './common';

export type KeywordState = 'ON' | 'OFF' | 'SUSPENDED';
export type KeywordStatus = 'ACCEPTED' | 'DRAFT' | 'MODERATION' | 'REJECTED';

export interface Keyword extends SyncMeta {
  adGroupLocalId: number;
  /** Текст ключевой фразы (с минус-словами). */
  keyword: string;
  state: KeywordState;
  status: KeywordStatus;
  /** Ставка на поиске, микро-единицы (1_000_000 = 1 у.е.), null = авто/наследование. */
  bidMicros: number | null;
  /** Ставка в сетях (РСЯ), микро-единицы, null = авто. */
  contextBidMicros: number | null;
}

export interface NewKeyword {
  directId?: number | null;
  adGroupLocalId: number;
  keyword: string;
  state?: KeywordState;
  status?: KeywordStatus;
  bidMicros?: number | null;
  contextBidMicros?: number | null;
}
