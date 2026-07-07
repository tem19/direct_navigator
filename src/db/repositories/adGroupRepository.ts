import type { Database } from 'better-sqlite3';
import {
  adGroupFromRow,
  adGroupServerSnapshot,
  nowIso,
  serializeRegionIds,
  type AdGroup,
  type NewAdGroup,
} from '../../core';
import type { AdGroupRow } from '../../core/mappers/rows';
import { BaseSyncRepository } from './base';

export class AdGroupRepository extends BaseSyncRepository<AdGroup, AdGroupRow> {
  constructor(db: Database) {
    super(db, 'ad_groups', adGroupFromRow, adGroupServerSnapshot);
  }

  create(input: NewAdGroup): number {
    const info = this.db
      .prepare(
        `INSERT INTO ad_groups
           (direct_id, campaign_local_id, name, type, status, region_ids,
            sync_status, server_hash, updated_at_local, synced_at)
         VALUES (@directId, @campaignLocalId, @name, @type, @status, @regionIds,
                 'new', NULL, @now, NULL)`,
      )
      .run({
        directId: input.directId ?? null,
        campaignLocalId: input.campaignLocalId,
        name: input.name,
        type: input.type,
        status: input.status ?? 'DRAFT',
        regionIds: serializeRegionIds(input.regionIds ?? []),
        now: nowIso(),
      });
    return Number(info.lastInsertRowid);
  }

  update(localId: number, patch: Partial<Omit<NewAdGroup, 'campaignLocalId'>>): void {
    const current = this.findByLocalId(localId);
    if (!current) throw new Error(`ad_group ${localId} not found`);
    this.db
      .prepare(
        `UPDATE ad_groups SET name=@name, type=@type, status=@status, region_ids=@regionIds
         WHERE local_id=@localId`,
      )
      .run({
        name: patch.name ?? current.name,
        type: patch.type ?? current.type,
        status: patch.status ?? current.status,
        regionIds: serializeRegionIds(patch.regionIds ?? current.regionIds),
        localId,
      });
    this.markModified(localId);
  }

  findByCampaign(campaignLocalId: number): AdGroup[] {
    const rows = this.db
      .prepare(`SELECT * FROM ad_groups WHERE campaign_local_id = ? ORDER BY local_id`)
      .all(campaignLocalId) as AdGroupRow[];
    return rows.map(adGroupFromRow);
  }
}
