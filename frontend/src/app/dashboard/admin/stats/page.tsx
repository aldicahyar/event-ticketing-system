'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, Download, RefreshCw, Scale } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import type {
  ReconciliationResult,
  RefundReport,
  RevenuePeriod,
  RevenueReport,
} from '@/types/analytics';

const PERIODS: Array<{ value: RevenuePeriod; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatBucket(bucket: string, period: RevenuePeriod) {
  const date = new Date(bucket);
  if (Number.isNaN(date.getTime())) return bucket;
  return period === 'monthly'
    ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AdminStatsPage() {
  const today = isoDay(new Date());
  const monthStart = isoDay(new Date(Date.now() - 29 * 86_400_000));

  const [period, setPeriod] = useState<RevenuePeriod>('daily');
  const [revenue, setRevenue] = useState<RevenueReport>();
  const [refunds, setRefunds] = useState<RefundReport>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [exporting, setExporting] = useState(false);
  const [recon, setRecon] = useState<ReconciliationResult>();
  const [reconLoading, setReconLoading] = useState(false);
  const [reconError, setReconError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [revenueReport, refundReport] = await Promise.all([
        apiClient.getRevenueReport(period),
        apiClient.getRefundReport(),
      ]);
      setRevenue(revenueReport);
      setRefunds(refundReport);
    } catch (loadError) {
      setRevenue(undefined);
      setRefunds(undefined);
      setError(apiClient.getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportCsv() {
    setExporting(true);
    setReconError('');
    try {
      const blob = await apiClient.exportPaymentsCsv(from, to);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payments-${from}_${to}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setReconError(apiClient.getErrorMessage(exportError));
    } finally {
      setExporting(false);
    }
  }

  async function reconcile() {
    setReconLoading(true);
    setReconError('');
    try {
      setRecon(await apiClient.getReconciliation(from, to));
    } catch (runError) {
      setRecon(undefined);
      setReconError(apiClient.getErrorMessage(runError));
    } finally {
      setReconLoading(false);
    }
  }

  const currency = 'IDR';
  const kpis = revenue
    ? [
        { label: 'GMV', value: formatCurrency(revenue.gmv, currency) },
        { label: 'Net revenue', value: formatCurrency(revenue.net_revenue, currency) },
        { label: 'Refund rate', value: formatPercent(revenue.refund_rate) },
        { label: 'Dispute rate', value: formatPercent(revenue.dispute_rate) },
      ]
    : [];

  const chartData =
    revenue?.series.map((point) => ({
      label: formatBucket(point.bucket, revenue.period),
      gross: point.gross,
      net: point.net,
    })) ?? [];

  return (
    <main className="space-y-6 md:space-y-8">
      <header className="flex flex-col gap-4 border-b border-mono-dark-grey pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-white md:text-4xl">
            Payment{' '}
            <span className="text-transparent stroke-text" style={{ WebkitTextStroke: '2px white' }}>
              Analytics
            </span>
          </h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-mono-light-grey md:text-sm">
            {'// REVENUE_REFUND_DISPUTE_KPI · LAST_90_DAYS'}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-bold uppercase" htmlFor="period">
            Period
            <select
              id="period"
              value={period}
              onChange={(event) => setPeriod(event.target.value as RevenuePeriod)}
              className="mt-2 min-h-touch w-full border border-mono-light-grey bg-black px-3 py-2 text-sm text-white"
            >
              {PERIODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-touch items-center gap-2 border border-mono-light-grey px-4 py-2 text-xs font-bold uppercase hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-3 border border-red-400 p-4 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-bold uppercase">Unable to load analytics</p>
            <p className="mt-1 break-words text-white">{error}</p>
          </div>
          <button type="button" onClick={() => void load()} className="shrink-0 underline underline-offset-4">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Loading analytics">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-24 animate-pulse border border-mono-dark-grey bg-white/5" />
          ))}
        </div>
      ) : revenue ? (
        <>
          <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <article key={kpi.label} className="border border-mono-dark-grey p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-mono-light-grey">
                  {kpi.label}
                </p>
                <p className="mt-2 text-xl font-black md:text-2xl">{kpi.value}</p>
              </article>
            ))}
          </section>

          <section aria-label="Revenue trend" className="border border-mono-dark-grey p-4">
            <h2 className="text-sm font-bold uppercase tracking-widest">Revenue trend</h2>
            {chartData.length === 0 ? (
              <p className="mt-6 text-sm text-mono-light-grey">No payments in this window.</p>
            ) : (
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                    <CartesianGrid stroke="#333" vertical={false} />
                    <XAxis dataKey="label" stroke="#999" fontSize={11} tickMargin={8} />
                    <YAxis
                      stroke="#999"
                      fontSize={11}
                      width={80}
                      tickFormatter={(value: number) => formatCurrency(value, currency)}
                    />
                    <Tooltip
                      contentStyle={{ background: '#000', border: '1px solid #555', fontSize: 12 }}
                      formatter={(value: number, name) => [formatCurrency(value, currency), name]}
                    />
                    <Area type="monotone" dataKey="gross" name="Gross" stroke="#fff" fill="#ffffff22" strokeWidth={2} />
                    <Area type="monotone" dataKey="net" name="Net" stroke="#7dd3fc" fill="#7dd3fc22" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {[
              { title: 'Top events by gross', rows: revenue.by_event, unit: 'Event' },
              { title: 'Top tiers by gross', rows: revenue.by_tier, unit: 'Tier' },
            ].map((table) => (
              <section key={table.title} aria-label={table.title} className="border border-mono-dark-grey">
                <h2 className="border-b border-mono-dark-grey bg-white/5 px-4 py-3 text-sm font-bold uppercase tracking-widest">
                  {table.title}
                </h2>
                {table.rows.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-mono-light-grey">No data yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase text-mono-light-grey">
                        <th scope="col" className="px-4 py-2 font-bold">{table.unit}</th>
                        <th scope="col" className="px-4 py-2 font-bold">Payments</th>
                        <th scope="col" className="px-4 py-2 text-right font-bold">Gross</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mono-dark-grey">
                      {table.rows.map((row) => (
                        <tr key={row.key}>
                          <td className="px-4 py-3">{row.label}</td>
                          <td className="px-4 py-3">{row.payments}</td>
                          <td className="px-4 py-3 text-right font-bold">
                            {formatCurrency(row.gross, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            ))}
          </div>

          {refunds && (
            <section aria-label="Refund funnel" className="border border-mono-dark-grey p-4">
              <h2 className="text-sm font-bold uppercase tracking-widest">Refund funnel (90 days)</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Requests', value: String(refunds.total_requested) },
                  { label: 'Completed', value: formatCurrency(refunds.completed_amount, currency) },
                  { label: 'In progress', value: formatCurrency(refunds.in_progress_amount, currency) },
                  { label: 'Failed', value: formatCurrency(refunds.failed_amount, currency) },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-[11px] font-bold uppercase tracking-widest text-mono-light-grey">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-lg font-black">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </>
      ) : null}

      <section aria-label="Accounting tools" className="border border-mono-dark-grey p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
          <Scale className="h-4 w-4" aria-hidden="true" />
          Accounting export &amp; reconciliation
        </h2>
        <p className="mt-1 text-xs text-mono-light-grey">
          Reconciliation compares database GMV against Stripe balance transactions. Range is capped at 31 days.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs font-bold uppercase" htmlFor="from">
            From
            <input
              id="from"
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-2 min-h-touch w-full border border-mono-light-grey bg-black px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs font-bold uppercase" htmlFor="to">
            To
            <input
              id="to"
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
              className="mt-2 min-h-touch w-full border border-mono-light-grey bg-black px-3 py-2 text-sm text-white"
            />
          </label>
          <button
            type="button"
            onClick={() => void exportCsv()}
            disabled={exporting}
            className="inline-flex min-h-touch items-center gap-2 border border-mono-light-grey px-4 py-2 text-xs font-bold uppercase hover:bg-white hover:text-black disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            type="button"
            onClick={() => void reconcile()}
            disabled={reconLoading}
            className="inline-flex min-h-touch items-center gap-2 border border-mono-light-grey px-4 py-2 text-xs font-bold uppercase hover:bg-white hover:text-black disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${reconLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            {reconLoading ? 'Reconciling…' : 'Run reconciliation'}
          </button>
        </div>

        {reconError && (
          <p role="alert" className="mt-4 border border-red-400 p-3 text-sm text-red-300">
            {reconError}
          </p>
        )}

        {recon && (
          <dl className="mt-5 grid gap-4 border-t border-mono-dark-grey pt-4 sm:grid-cols-2 lg:grid-cols-5" aria-live="polite">
            {[
              { label: 'DB GMV', value: formatCurrency(recon.db_gmv, currency) },
              { label: 'Stripe gross', value: formatCurrency(recon.stripe_gross, currency) },
              { label: 'Stripe fees', value: formatCurrency(recon.stripe_fees, currency) },
              { label: 'Difference', value: formatCurrency(recon.difference, currency) },
              { label: 'Status', value: `${recon.status} · ${formatPercent(recon.difference_pct)}` },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-[11px] font-bold uppercase tracking-widest text-mono-light-grey">
                  {item.label}
                </dt>
                <dd className={`mt-1 font-black ${item.label === 'Status' && recon.status === 'MISMATCHED' ? 'text-red-300' : ''}`}>
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </main>
  );
}
