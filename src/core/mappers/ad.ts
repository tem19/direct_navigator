import type { Ad, AdStatus, AdType } from '../types/ad';
import type { AdRow } from './rows';
import { syncMetaFromRow } from './syncMeta';

export function adFromRow(row: AdRow): Ad {
  return {
    ...syncMetaFromRow(row),
    adGroupLocalId: row.ad_group_local_id,
    type: row.type as AdType,
    status: row.status as AdStatus,
    title: row.title,
    title2: row.title2,
    text: row.text,
    href: row.href,
    displayUrlPath: row.display_url_path,
  };
}

export function adServerSnapshot(
  a: Pick<Ad, 'type' | 'status' | 'title' | 'title2' | 'text' | 'href' | 'displayUrlPath'>,
): Record<string, unknown> {
  return {
    type: a.type,
    status: a.status,
    title: a.title,
    title2: a.title2,
    text: a.text,
    href: a.href,
    displayUrlPath: a.displayUrlPath,
  };
}
