import type { Database } from 'better-sqlite3';
import {
  keywordFromRow,
  keywordServerSnapshot,
  nowIso,
  type Keyword,
  type NewKeyword,
} from '../../core';
import type { KeywordRow } from '../../core/mappers/rows';
import { BaseSyncRepository } from './base';

export class KeywordRepository extends BaseSyncRepository<Keyword, KeywordRow> {
  constructor(db: Database) {
    super(db, 'keywords', keywordFromRow, keywordServerSnapshot);
  }

  create(input: NewKeyword): number {
    const info = this.db
      .prepare(
        `INSERT INTO keywords
           (direct_id, ad_group_local_id, keyword, state, status, bid_micros, context_bid_micros,
            sync_status, server_hash, updated_at_local, synced_at)
         VALUES (@directId, @adGroupLocalId, @keyword, @state, @status, @bidMicros, @contextBidMicros,
                 'new', NULL, @now, NULL)`,
      )
      .run({
        directId: input.directId ?? null,
        adGroupLocalId: input.adGroupLocalId,
        keyword: input.keyword,
        state: input.state ?? 'ON',
        status: input.status ?? 'DRAFT',
        bidMicros: input.bidMicros ?? null,
        contextBidMicros: input.contextBidMicros ?? null,
        now: nowIso(),
      });
    return Number(info.lastInsertRowid);
  }

  update(localId: number, patch: Partial<Omit<NewKeyword, 'adGroupLocalId'>>): void {
    const current = this.findByLocalId(localId);
    if (!current) throw new Error(`keyword ${localId} not found`);
    this.db
      .prepare(
        `UPDATE keywords
           SET keyword=@keyword, state=@state, status=@status,
               bid_micros=@bidMicros, context_bid_micros=@contextBidMicros
         WHERE local_id=@localId`,
      )
      .run({
        keyword: patch.keyword ?? current.keyword,
        state: patch.state ?? current.state,
        status: patch.status ?? current.status,
        bidMicros: patch.bidMicros !== undefined ? patch.bidMicros : current.bidMicros,
        contextBidMicros:
          patch.contextBidMicros !== undefined ? patch.contextBidMicros : current.contextBidMicros,
        localId,
      });
    this.markModified(localId);
  }

  /** Массовое проставление ставки (частый bulk-сценарий Коммандера). */
  setBid(localIds: number[], bidMicros: number): void {
    const stmt = this.db.prepare(
      `UPDATE keywords
         SET bid_micros=?, updated_at_local=?,
             sync_status=CASE sync_status WHEN 'synced' THEN 'modified' ELSE sync_status END
       WHERE local_id=?`,
    );
    const tx = this.db.transaction((ids: number[]) => {
      for (const id of ids) stmt.run(bidMicros, nowIso(), id);
    });
    tx(localIds);
  }

  findByAdGroup(adGroupLocalId: number): Keyword[] {
    const rows = this.db
      .prepare(`SELECT * FROM keywords WHERE ad_group_local_id = ? ORDER BY local_id`)
      .all(adGroupLocalId) as KeywordRow[];
    return rows.map(keywordFromRow);
  }
}
