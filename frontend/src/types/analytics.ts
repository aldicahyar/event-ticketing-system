/** Mirrors backend AnalyticsService return shapes (GAP-07). */

export type RevenuePeriod = 'daily' | 'weekly' | 'monthly';

export interface RevenueBreakdownRow {
  key: string;
  label: string;
  payments: number;
  gross: number;
}

export interface RevenueSeriesPoint {
  bucket: string;
  gross: number;
  net: number;
}

export interface RevenueReport {
  period: RevenuePeriod;
  from: string;
  to: string;
  gmv: number;
  refunded: number;
  disputed: number;
  net_revenue: number;
  refund_rate: number;
  dispute_rate: number;
  series: RevenueSeriesPoint[];
  by_event: RevenueBreakdownRow[];
  by_tier: RevenueBreakdownRow[];
}

export interface RefundReport {
  from: string;
  to: string;
  total_requested: number;
  requested_amount: number;
  completed_amount: number;
  completed_count: number;
  rejected_amount: number;
  failed_amount: number;
  in_progress_amount: number;
}

export interface ReconciliationResult {
  from: string;
  to: string;
  db_gmv: number;
  stripe_gross: number;
  stripe_fees: number;
  stripe_net: number;
  difference: number;
  difference_pct: number;
  status: 'MATCHED' | 'MISMATCHED';
  sample: Array<{ id: string; type: string; amount: number; created: number }>;
}
