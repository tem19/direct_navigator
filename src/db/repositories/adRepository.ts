import type { Database } from 'better-sqlite3';
import { adFromRow, adServerSnapshot, nowIso, type Ad, type NewAd } from '../../core';
import type { AdRow } from '../../core/mappers/rows';
import { BaseSyncRepository } from './base';

export class AdRepository extends BaseSyncRepository<Ad, AdRow> {
  constructor(db: Database) {
    super(db, 'ads', adFromRow, adServerSnapshot);
  }

  create(input: NewAd): number {
    const info = this.db
      .prepare(
        `INSERT INTO ads
           (direct_id, ad_group_local_id, type, status, title, title2, text, href, display_url_path,
            sync_status, server_hash, updated_at_local, synced_at)
         VALUES (@directId, @adGroupLocalId, @type, @status, @title, @title2, @text, @href, @displayUrlPath,
                 'new', NULL, @now, NULL)`,
      )
      .run({
        directId: input.directId ?? null,
        adGroupLocalId: input.adGroupLocalId,
        type: input.type,
        status: input.status ?? 'DRAFT',
        title: input.title,
        title2: input.title2 ?? null,
        text: input.text,
        href: input.href ?? null,
        displayUrlPath: input.displayUrlPath ?? null,
        now: nowIso(),
      });
    return Number(info.lastInsertRowid);
  }

  update(localId: number, patch: Partial<Omit<NewAd, 'adGroupLocalId'>>): void {
    const current = this.findByLocalId(localId);
    if (!current) throw new Error(`ad ${localId} not found`);
    this.db
      .prepare(
        `UPDATE ads
           SET type=@type, status=@status, title=@title, title2=@title2,
               text=@text, href=@href, display_url_path=@displayUrlPath
         WHERE local_id=@localId`,
      )
      .run({
        type: patch.type ?? current.type,
        status: patch.status ?? current.status,
        title: patch.title ?? current.title,
        title2: patch.title2 !== undefined ? patch.title2 : current.title2,
        text: patch.text ?? current.text,
        href: patch.href !== undefined ? patch.href : current.href,
        displayUrlPath:
          patch.displayUrlPath !== undefined ? patch.displayUrlPath : current.displayUrlPath,
        localId,
      });
    this.markModified(localId);
  }

  findByAdGroup(adGroupLocalId: number): Ad[] {
    const rows = this.db
      .prepare(`SELECT * FROM ads WHERE ad_group_local_id = ? ORDER BY local_id`)
      .all(adGroupLocalId) as AdRow[];
    return rows.map(adFromRow);
  }
}
