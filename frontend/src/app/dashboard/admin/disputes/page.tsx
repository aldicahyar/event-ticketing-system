'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Scale,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import type {
  DisputeListMeta,
  DisputeStatus,
  DisputeSummary,
} from '@/types/dispute';

const STATUSES: Array<{ value: '' | DisputeStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Under review' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
];

const PAGE_SIZE = 20;

function formatDateTime(value?: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getDeadlineState(value?: string | null) {
  if (!value) return { overdue: false, label: 'No deadline' };
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return { overdue: false, label: 'No deadline' };
  const overdue = time <= Date.now();
  return {
    overdue,
    label: overdue ? `Overdue · ${formatDateTime(value)}` : formatDateTime(value),
  };
}

function statusLabel(status: DisputeStatus) {
  return status === 'CLOSED' ? 'Under review' : status.toLowerCase();
}

function customerLabel(dispute: DisputeSummary) {
  const booking = dispute.booking;
  return (
    booking.user?.name ||
    booking.guest_name ||
    booking.user?.email ||
    booking.guest_email ||
    'Unknown customer'
  );
}

export default function AdminDisputesPage() {
  const [items, setItems] = useState<DisputeSummary[]>([]);
  const [meta, setMeta] = useState<DisputeListMeta>();
  const [status, setStatus] = useState<'' | DisputeStatus>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiClient.listDisputes({
        status: status || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setItems(result.data);
      setMeta(result.meta);
    } catch (loadError) {
      setItems([]);
      setMeta(undefined);
      setError(apiClient.getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const canGoBack = meta ? meta.hasPrev : page > 1;
  const canGoForward = meta ? meta.hasNext : items.length === PAGE_SIZE;

  return (
    <main className="space-y-6 p-4 sm:p-6 md:p-8">
      <header className="flex flex-col gap-4 border-b border-mono-dark-grey pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <Scale className="mt-0.5 h-7 w-7 shrink-0" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-black uppercase">Dispute Management</h1>
            <p className="mt-1 max-w-2xl text-sm text-mono-light-grey">
              Review chargebacks, prepare evidence, and track Stripe outcomes.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-touch items-center justify-center gap-2 border border-mono-light-grey px-4 py-2 text-xs font-bold uppercase hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <section aria-labelledby="dispute-filters" className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block w-full max-w-xs text-xs font-bold uppercase" htmlFor="status-filter">
          <span id="dispute-filters">Status</span>
          <select
            id="status-filter"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as '' | DisputeStatus);
              setPage(1);
            }}
            className="mt-2 min-h-touch w-full border border-mono-light-grey bg-black px-3 py-2 text-sm text-white"
          >
            {STATUSES.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {!loading && !error && (
          <p className="text-xs uppercase text-mono-light-grey" aria-live="polite">
            {meta ? `${meta.total} disputes · page ${meta.page} of ${meta.totalPages}` : `${items.length} disputes on page ${page}`}
          </p>
        )}
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 border border-red-400 p-4 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-bold uppercase">Unable to load disputes</p>
            <p className="mt-1 break-words text-white">{error}</p>
          </div>
          <button type="button" onClick={() => void load()} className="shrink-0 underline underline-offset-4">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading disputes">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-32 animate-pulse border border-mono-dark-grey bg-white/5" />
          ))}
        </div>
      ) : !error && items.length === 0 ? (
        <div className="border border-mono-dark-grey px-5 py-12 text-center">
          <Scale className="mx-auto h-8 w-8 text-mono-light-grey" aria-hidden="true" />
          <p className="mt-3 font-bold uppercase">No disputes found</p>
          <p className="mt-1 text-sm text-mono-light-grey">
            {status ? `There are no ${statusLabel(status)} disputes.` : 'New chargebacks will appear here.'}
          </p>
        </div>
      ) : !error ? (
        <div className="overflow-hidden border border-mono-dark-grey">
          <div className="hidden grid-cols-[minmax(150px,1.2fr)_minmax(140px,1fr)_130px_minmax(180px,1.2fr)_110px_44px] gap-4 border-b border-mono-dark-grey bg-white/5 px-4 py-3 text-[11px] font-bold uppercase text-mono-light-grey lg:grid">
            <span>Booking / Event</span>
            <span>Customer / Reason</span>
            <span>Amount</span>
            <span>Evidence deadline</span>
            <span>Status</span>
            <span className="sr-only">View</span>
          </div>
          <div className="divide-y divide-mono-dark-grey">
            {items.map((dispute) => {
              const deadline = getDeadlineState(dispute.evidence_due_by);
              return (
                <article key={dispute.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(150px,1.2fr)_minmax(140px,1fr)_130px_minmax(180px,1.2fr)_110px_44px] lg:items-center">
                  <div className="min-w-0">
                    <Link href={`/dashboard/admin/disputes/${dispute.id}`} className="font-bold uppercase underline-offset-4 hover:underline">
                      {dispute.booking.booking_code}
                    </Link>
                    <p className="mt-1 truncate text-sm text-mono-light-grey">{dispute.booking.event.title}</p>
                    <p className="mt-1 text-[11px] text-mono-light-grey">Opened {formatDateTime(dispute.opened_at)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{customerLabel(dispute)}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-mono-light-grey">{dispute.reason || 'No reason provided'}</p>
                  </div>
                  <div>
                    <p className="font-bold">{formatCurrency(dispute.amount, dispute.currency)}</p>
                    <p className="mt-1 text-[11px] uppercase text-mono-light-grey">{dispute.currency}</p>
                  </div>
                  <div className={`flex items-start gap-2 text-xs ${deadline.overdue && dispute.status === 'OPEN' ? 'text-red-300' : 'text-mono-light-grey'}`}>
                    {deadline.overdue && dispute.status === 'OPEN' ? (
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                    <span>{deadline.label}</span>
                  </div>
                  <span className="w-fit border border-mono-light-grey px-2 py-1 text-[11px] font-bold uppercase">
                    {statusLabel(dispute.status)}
                  </span>
                  <Link
                    href={`/dashboard/admin/disputes/${dispute.id}`}
                    aria-label={`View dispute for booking ${dispute.booking.booking_code}`}
                    className="inline-flex h-11 w-11 items-center justify-center border border-mono-dark-grey hover:border-white hover:bg-white hover:text-black"
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {!loading && !error && (canGoBack || canGoForward || (meta?.totalPages ?? 1) > 1) && (
        <nav aria-label="Dispute pagination" className="flex items-center justify-between gap-4 border-t border-mono-dark-grey pt-4">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={!canGoBack}
            className="inline-flex min-h-touch items-center gap-2 border border-mono-light-grey px-4 py-2 text-xs font-bold uppercase disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
          </button>
          <span className="text-xs uppercase text-mono-light-grey">Page {meta?.page ?? page}{meta ? ` of ${meta.totalPages}` : ''}</span>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={!canGoForward}
            className="inline-flex min-h-touch items-center gap-2 border border-mono-light-grey px-4 py-2 text-xs font-bold uppercase disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </main>
  );
}
