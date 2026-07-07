import type { Keyword, KeywordState, KeywordStatus } from '../types/keyword';
import type { KeywordRow } from './rows';
import { syncMetaFromRow } from './syncMeta';

export function keywordFromRow(row: KeywordRow): Keyword {
  return {
    ...syncMetaFromRow(row),
    adGroupLocalId: row.ad_group_local_id,
    keyword: row.keyword,
    state: row.state as KeywordState,
    status: row.status as KeywordStatus,
    bidMicros: row.bid_micros,
    contextBidMicros: row.context_bid_micros,
  };
}

export function keywordServerSnapshot(
  k: Pick<Keyword, 'keyword' | 'state' | 'status' | 'bidMicros' | 'contextBidMicros'>,
): Record<string, unknown> {
  return {
    keyword: k.keyword,
    state: k.state,
    status: k.status,
    bidMicros: k.bidMicros,
    contextBidMicros: k.contextBidMicros,
  };
}
