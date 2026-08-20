import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, RefundStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { StripeService } from '../../common/stripe/stripe.service';
import { RevenuePeriod } from './dto/analytics-query.dto';

/** Stripe balance transaction amounts are minor units; DB stores IDR main units. */
const MINOR_UNIT_DIVISOR = 100;

/** Maximum span (days) for a reconciliation run. */
const RECON_MAX_SPAN_DAYS = 31;

/** Default dashboard lookback (days). */
const DEFAULT_DAYS = 90;

interface BucketedRow {
  bucket: Date;
  gross: number;
}

interface RefundRow {
  bucket: Date;
  refunded: number;
}

interface DisputeRow {
  bucket: Date;
  disputed: number;
}

interface DbPaymentRow {
  id: string;
  booking_code: string;
  event_title: string;
  status: string;
  provider: string;
  provider_tx_id: string | null;
  currency: string;
  amount: number;
  paid_at: Date | null;
  refunded: number;
  disputed: number;
}

/** One row in the accounting CSV export. */
export interface PaymentExportRow {
  payment_date: string;
  booking_code: string;
  event_title: string;
  status: string;
  provider: string;
  provider_tx_id: string;
  currency: string;
  amount: number;
  refunded_amount: number;
  dispute_amount: number;
  net_amount: number;
}

export interface RevenueBreakdownRow {
  key: string;
  label: string;
  payments: number;
  gross: number;
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
  series: Array<{ bucket: string; gross: number; net: number }>;
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
  /** Stripe balance transactions sampled (for debugging/audit). */
  sample: Array<{ id: string; type: string; amount: number; created: number }>;
}

const PERIOD_UNIT: Record<RevenuePeriod, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async revenue(period: RevenuePeriod): Promise<RevenueReport> {
    const { from, to } = this.dashboardWindow(DEFAULT_DAYS);
    const unit = PERIOD_UNIT[period];

    const [grossRows, refundRows, disputeRows] = await Promise.all([
      this.prisma.$queryRaw<BucketedRow[]>(Prisma.sql`
        SELECT date_trunc(${unit}::text, p.paid_at) AS bucket, SUM(p.amount) AS gross
        FROM t_trx_payments p
        WHERE p.paid_at >= ${from}::timestamptz AND p.paid_at < ${to}::timestamptz
        GROUP BY 1
        ORDER BY 1`),
      this.prisma.$queryRaw<RefundRow[]>(Prisma.sql`
        SELECT date_trunc(${unit}::text, r.completed_at) AS bucket, SUM(r.amount) AS refunded
        FROM t_trx_refunds r
        WHERE r.status = ${RefundStatus.COMPLETED}::"RefundStatus"
          AND r.completed_at >= ${from}::timestamptz AND r.completed_at < ${to}::timestamptz
        GROUP BY 1
        ORDER BY 1`),
      this.prisma.$queryRaw<DisputeRow[]>(Prisma.sql`
        SELECT date_trunc(${unit}::text, d.closed_at) AS bucket, SUM(d.amount) AS disputed
        FROM t_trx_disputes d
        WHERE d.status = 'LOST'
          AND d.closed_at >= ${from}::timestamptz AND d.closed_at < ${to}::timestamptz
        GROUP BY 1
        ORDER BY 1`),
    ]);

    const gmv = grossRows.reduce((sum, row) => sum + Number(row.gross), 0);
    const refunded = refundRows.reduce((sum, row) => sum + Number(row.refunded), 0);
    const disputed = disputeRows.reduce((sum, row) => sum + Number(row.disputed), 0);

    // Merge all three series into one timeline (union of bucket keys).
    const buckets = new Map<string, { gross: number; refunded: number; disputed: number }>();
    for (const row of grossRows) {
      buckets.set(row.bucket.toISOString(), {
        gross: Number(row.gross),
        refunded: 0,
        disputed: 0,
      });
    }
    for (const row of refundRows) {
      const key = row.bucket.toISOString();
      const entry = buckets.get(key) ?? { gross: 0, refunded: 0, disputed: 0 };
      entry.refunded = Number(row.refunded);
      buckets.set(key, entry);
    }
    for (const row of disputeRows) {
      const key = row.bucket.toISOString();
      const entry = buckets.get(key) ?? { gross: 0, refunded: 0, disputed: 0 };
      entry.disputed = Number(row.disputed);
      buckets.set(key, entry);
    }
    const series = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, values]) => ({
        bucket,
        gross: values.gross,
        net: values.gross - values.refunded - values.disputed,
      }));

    const [byEvent, byTier] = await Promise.all([
      this.breakdownByEvent(from, to),
      this.breakdownByTier(from, to),
    ]);

    return {
      period,
      from: from.toISOString(),
      to: to.toISOString(),
      gmv,
      refunded,
      disputed,
      net_revenue: gmv - refunded - disputed,
      refund_rate: gmv > 0 ? refunded / gmv : 0,
      dispute_rate: gmv > 0 ? disputed / gmv : 0,
      series,
      by_event: byEvent,
      by_tier: byTier,
    };
  }

  async refunds(): Promise<RefundReport> {
    const { from, to } = this.dashboardWindow(DEFAULT_DAYS);
    const [aggregated, byStatus] = await Promise.all([
      this.prisma.t_trx_refunds.aggregate({
        where: { created_at: { gte: from, lt: to } },
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.t_trx_refunds.groupBy({
        by: ['status'],
        where: { created_at: { gte: from, lt: to } },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    const pick = (status: RefundStatus) => byStatus.find((row) => row.status === status);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      total_requested: aggregated._count.id,
      requested_amount: Number(aggregated._sum.amount ?? 0),
      completed_amount: Number(pick(RefundStatus.COMPLETED)?._sum.amount ?? 0),
      completed_count: pick(RefundStatus.COMPLETED)?._count.id ?? 0,
      rejected_amount: Number(pick(RefundStatus.REJECTED)?._sum.amount ?? 0),
      failed_amount: Number(pick(RefundStatus.FAILED)?._sum.amount ?? 0),
      in_progress_amount:
        Number(pick(RefundStatus.REQUESTED)?._sum.amount ?? 0) +
        Number(pick(RefundStatus.PROCESSING)?._sum.amount ?? 0),
    };
  }

  /** One row per payment transaction, newest first, for the accounting export. */
  async export(from: string, to: string): Promise<PaymentExportRow[]> {
    const { start, end } = this.resolveRange(from, to);
    const rows = await this.prisma.$queryRaw<DbPaymentRow[]>(Prisma.sql`
      SELECT
        p.id,
        b.booking_code,
        e.title AS event_title,
        p.status,
        p.provider,
        p.provider_tx_id,
        p.currency,
        p.amount,
        p.paid_at,
        COALESCE(
          (SELECT SUM(r.amount) FROM t_trx_refunds r
           WHERE r.payment_id = p.id AND r.status = 'COMPLETED'), 0) AS refunded,
        COALESCE(
          (SELECT SUM(d.amount) FROM t_trx_disputes d
           WHERE d.payment_id = p.id AND d.status = 'LOST'), 0) AS disputed
      FROM t_trx_payments p
      JOIN t_trx_bookings b ON b.id = p.booking_id
      JOIN t_trx_events e ON e.id = b.event_id
      WHERE p.paid_at >= ${start}::timestamptz AND p.paid_at < ${end}::timestamptz
      ORDER BY p.paid_at DESC NULLS LAST, p.created_at DESC`);

    return rows.map((row) => ({
      payment_date: row.paid_at?.toISOString() ?? '',
      booking_code: row.booking_code,
      event_title: row.event_title,
      status: row.status,
      provider: row.provider,
      provider_tx_id: row.provider_tx_id ?? '',
      currency: row.currency,
      amount: Number(row.amount),
      refunded_amount: Number(row.refunded),
      dispute_amount: Number(row.disputed),
      net_amount: Number(row.amount) - Number(row.refunded) - Number(row.disputed),
    }));
  }

  /**
   * On-demand reconciliation: compare the DB's paid GMV against Stripe
   * Balance transactions (charges) in the same window. Stripe amounts are
   * minor units (IDR: rupiah amount × 100, matching how Checkout is built).
   */
  async reconciliation(from: string, to: string): Promise<ReconciliationResult> {
    const { start, end } = this.resolveRange(from, to, RECON_MAX_SPAN_DAYS);

    const [dbAggregate, balanceTx] = await Promise.all([
      this.prisma.t_trx_payments.aggregate({
        where: {
          paid_at: { gte: start, lt: end },
          status: { in: ['COMPLETED', 'REFUNDED', 'DISPUTED'] },
        },
        _sum: { amount: true },
      }),
      this.stripe.client.balanceTransactions.list({
        created: {
          gte: Math.floor(start.getTime() / 1000),
          lte: Math.floor((end.getTime() - 1) / 1000),
        },
        limit: 100,
      }),
    ]);

    let stripeGross = 0;
    let stripeFees = 0;
    for (const tx of balanceTx.data) {
      if (tx.type !== 'charge' && tx.type !== 'payment') {
        continue;
      }
      stripeGross += tx.amount / MINOR_UNIT_DIVISOR;
      if (tx.fee > 0) {
        stripeFees += tx.fee / MINOR_UNIT_DIVISOR;
      }
    }
    const stripeNet = stripeGross - stripeFees;

    const dbGmv = Number(dbAggregate._sum.amount ?? 0);
    const difference = dbGmv - stripeGross;
    const differencePct = stripeGross !== 0 ? Math.abs(difference / stripeGross) : difference;

    return {
      from,
      to,
      db_gmv: dbGmv,
      stripe_gross: stripeGross,
      stripe_fees: stripeFees,
      stripe_net: stripeNet,
      difference,
      difference_pct: differencePct,
      status: Math.abs(differencePct) < 0.0001 ? 'MATCHED' : 'MISMATCHED',
      sample: balanceTx.data.slice(0, 5).map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        created: tx.created,
      })),
    };
  }

  private async breakdownByEvent(from: Date, to: Date): Promise<RevenueBreakdownRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; title: string; payments: number; gross: number }>
    >(Prisma.sql`
      SELECT e.id, e.title, COUNT(p.id)::int AS payments, SUM(p.amount) AS gross
      FROM t_trx_payments p
      JOIN t_trx_bookings b ON b.id = p.booking_id
      JOIN t_trx_events e ON e.id = b.event_id
      WHERE p.paid_at >= ${from}::timestamptz AND p.paid_at < ${to}::timestamptz
      GROUP BY e.id, e.title
      ORDER BY gross DESC
      LIMIT 10`);
    return rows.map((row) => ({
      key: row.id,
      label: row.title,
      payments: row.payments,
      gross: Number(row.gross),
    }));
  }

  private async breakdownByTier(from: Date, to: Date): Promise<RevenueBreakdownRow[]> {
    // Tickets are created with seat_id only (tier_id stays NULL), so resolve the
    // tier through the seat. Allocate each payment's actual amount across its
    // tickets proportionally by face value so breakdown sums match GMV.
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; name: string; payments: number; gross: number }>
    >(Prisma.sql`
      WITH tp AS (
        SELECT tk.id, tk.booking_id,
               COALESCE(tk.tier_id, s.tier_id) AS tier_id,
               COALESCE(s.price, 0) AS price
        FROM t_trx_tickets tk
        LEFT JOIN t_mtr_seats s ON s.id = tk.seat_id
      ),
      bt AS (
        SELECT booking_id, SUM(price) AS total FROM tp GROUP BY booking_id
      )
      SELECT tt.id, tt.name, COUNT(DISTINCT p.id)::int AS payments,
             SUM(p.amount * tp.price / NULLIF(bt.total, 0)) AS gross
      FROM tp
      JOIN bt ON bt.booking_id = tp.booking_id
      JOIN t_trx_payments p ON p.booking_id = tp.booking_id
      JOIN t_trx_event_ticket_tiers tt ON tt.id = tp.tier_id
      WHERE p.paid_at >= ${from}::timestamptz AND p.paid_at < ${to}::timestamptz
      GROUP BY tt.id, tt.name
      ORDER BY gross DESC
      LIMIT 10`);
    return rows.map((row) => ({
      key: row.id,
      label: row.name,
      payments: row.payments,
      gross: Number(row.gross),
    }));
  }

  /** Inclusive calendar-day window, capped at `maxDays` span. */
  private resolveRange(from: string, to: string, maxDays?: number): { start: Date; end: Date } {
    const start = new Date(`${from}T00:00:00.000Z`);
    const endInclusive = new Date(`${to}T23:59:59.999Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(endInclusive.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (start > endInclusive) {
      throw new BadRequestException('`from` must not be after `to`');
    }
    if (maxDays) {
      const spanDays = (endInclusive.getTime() - start.getTime()) / 86_400_000;
      if (spanDays > maxDays) {
        throw new BadRequestException(`Date range must not exceed ${maxDays} days`);
      }
    }
    // `end` is exclusive in queries; add one millisecond past end-of-day.
    const end = new Date(endInclusive.getTime() + 1);
    return { start, end };
  }

  /** Rolling window ending now, used when no explicit range is supplied. */
  private dashboardWindow(days: number): { from: Date; to: Date } {
    const end = new Date();
    const from = new Date(end.getTime() - days * 86_400_000);
    return { from, to: end };
  }

  /** RFC 4180 escaping + formula-injection guard (Excel accounting export). */
  csvCell(value: unknown): string {
    const raw = value === null || value === undefined ? '' : String(value);
    const guarded = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
  }
}
