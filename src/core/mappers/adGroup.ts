import type { AdGroup, AdGroupStatus, AdGroupType } from '../types/adGroup';
import type { AdGroupRow } from './rows';
import { syncMetaFromRow } from './syncMeta';

function parseRegionIds(raw: string | null): number[] {
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? parsed.map(Number) : [];
}

export function adGroupFromRow(row: AdGroupRow): AdGroup {
  return {
    ...syncMetaFromRow(row),
    campaignLocalId: row.campaign_local_id,
    name: row.name,
    type: row.type as AdGroupType,
    status: row.status as AdGroupStatus,
    regionIds: parseRegionIds(row.region_ids),
  };
}

/** Сериализация regionIds для записи в БД (единственное место кодирования). */
export function serializeRegionIds(regionIds: number[]): string {
  return JSON.stringify(regionIds ?? []);
}

export function adGroupServerSnapshot(
  g: Pick<AdGroup, 'name' | 'type' | 'status' | 'regionIds'>,
): Record<string, unknown> {
  return { name: g.name, type: g.type, status: g.status, regionIds: g.regionIds };
}
