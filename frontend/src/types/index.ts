export type ReportingMode = 'none' | 'heartbeat' | 'stats';

export interface Instance {
  id: number;
  display_name: string;
  canonical_url: string;
  description: string | null;
  country: string | null;
  region: string | null;
  metro: string | null;
  contact_url: string | null;
  last_seen_at: string | null;
  software_version: string | null;
  reporting_mode: ReportingMode;
  created_at: string;
}

export interface InstanceDetail extends Instance {
  latest_node_count: number | null;
  latest_map_bounds_coarse: string | null;
  latest_stats_at: string | null;
}
