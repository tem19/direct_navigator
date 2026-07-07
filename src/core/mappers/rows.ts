/**
 * Плоские снимки строк БД (snake_case). Это чистые data-shapes, а не SQL:
 * мапперы конвертируют dbRow <-> domain, репозитории читают/пишут ровно эти поля.
 */

export interface SyncRowBase {
  local_id: number;
  direct_id: number | null;
  sync_status: string;
  server_hash: string | null;
  updated_at_local: string;
  synced_at: string | null;
}

export interface ClientRow extends SyncRowBase {
  login: string;
  name: string | null;
}

export interface CampaignRow extends SyncRowBase {
  client_local_id: number;
  name: string;
  type: string;
  status: string;
  state: string;
  daily_budget_micros: number | null;
  start_date: string | null;
  end_date: string | null;
}

export interface AdGroupRow extends SyncRowBase {
  campaign_local_id: number;
  name: string;
  type: string;
  status: string;
  region_ids: string | null; // JSON-массив
}

export interface AdRow extends SyncRowBase {
  ad_group_local_id: number;
  type: string;
  status: string;
  title: string;
  title2: string | null;
  text: string;
  href: string | null;
  display_url_path: string | null;
}

export interface KeywordRow extends SyncRowBase {
  ad_group_local_id: number;
  keyword: string;
  state: string;
  status: string;
  bid_micros: number | null;
  context_bid_micros: number | null;
}
