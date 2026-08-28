'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Search, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';

const STATUSES = ['', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'];

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  provider_tx_id: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
  booking: {
    booking_code: string;
    status: string;
    user: { name: string; email: string } | null;
    event: { title: string } | null;
  };
}

export default function AdminOpsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [meta, setMeta] = useState<{ page: number; totalPages: number; total: number }>();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.getAdminPayments({ status, search, page, limit: 20 });
      setRows(res.data ?? []);
      setMeta(res.meta);
    } catch (err) {
      setRows([]);
      setError(apiClient.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="space-y-6 md:space-y-8">
      <header className="flex flex-col gap-4 border-b border-mono-dark-grey pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-white md:text-4xl">
            Operations{' '}
            <span className="text-transparent stroke-text" style={{ WebkitTextStroke: '2px white' }}>
              Center
            </span>
          </h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-mono-light-grey md:text-sm">
            {'// PAYMENT_TRANSACTIONS · LIVE_STRIPE · MANUAL_REFUND'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-touch items-center gap-2 border border-mono-light-grey px-4 py-2 text-xs font-bold uppercase hover:bg-white hover:text-black disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold uppercase" htmlFor="status">
          Status
          <select
            id="status"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="mt-2 block min-h-touch border border-mono-light-grey bg-black px-3 py-2 text-sm text-white"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s || 'All'}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-xs font-bold uppercase" htmlFor="search">
          Search booking / tx id
          <div className="mt-2 flex items-center border border-mono-light-grey bg-black">
            <Search className="ml-3 h-4 w-4 text-mono-light-grey" aria-hidden="true" />
            <input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1);
                  void load();
                }
              }}
              placeholder="BK-XXXX or pi_..."
              className="min-h-touch w-full bg-transparent px-3 py-2 text-sm text-white outline-none"
            />
          </div>
        </label>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 border border-red-400 p-4 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1 break-words text-white">{error}</p>
        </div>
      )}

      <section aria-label="Payments" className="overflow-x-auto border border-mono-dark-grey">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-mono-light-grey">
              <th scope="col" className="px-4 py-2 font-bold">Booking</th>
              <th scope="col" className="px-4 py-2 font-bold">Event</th>
              <th scope="col" className="px-4 py-2 font-bold">Customer</th>
              <th scope="col" className="px-4 py-2 font-bold">Status</th>
              <th scope="col" className="px-4 py-2 text-right font-bold">Amount</th>
              <th scope="col" className="px-4 py-2 font-bold">Date</th>
              <th scope="col" className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-mono-dark-grey">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-mono-light-grey">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-mono-light-grey">
                  No payments found.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-mono">{p.booking.booking_code}</td>
                  <td className="px-4 py-3">{p.booking.event?.title ?? '—'}</td>
                  <td className="px-4 py-3">{p.booking.user?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="border border-mono-light-grey px-2 py-0.5 text-[11px] uppercase">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    {formatCurrency(Number(p.amount), p.currency)}
                  </td>
                  <td className="px-4 py-3 text-mono-light-grey">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(p.id)}
                      className="underline underline-offset-4 hover:text-white"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs uppercase">
          <span className="text-mono-light-grey">
            Page {meta.page} / {meta.totalPages} · {meta.total} total
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((n) => n - 1)}
              className="border border-mono-light-grey px-3 py-1 font-bold disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((n) => n + 1)}
              className="border border-mono-light-grey px-3 py-1 font-bold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selected && (
        <PaymentDetailDrawer
          id={selected}
          onClose={() => setSelected(undefined)}
          onRefunded={() => {
            setSelected(undefined);
            void load();
          }}
        />
      )}
    </main>
  );
}

/* Payment detail drawer: DB record + live Stripe PaymentIntent + admin refund. */
function PaymentDetailDrawer({
  id,
  onClose,
  onRefunded,
}: {
  id: string;
  onClose: () => void;
  onRefunded: () => void;
}) {
  const [data, setData] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiClient
      .getAdminPaymentDetail(id)
      .then((res) => alive && setData(res))
      .catch((err) => alive && setError(apiClient.getErrorMessage(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const refund = async () => {
    if (!note.trim()) {
      setRefundError('A justification note is required.');
      return;
    }
    setRefunding(true);
    setRefundError('');
    try {
      await apiClient.adminRefundPayment(id, note.trim());
      onRefunded();
    } catch (err) {
      setRefundError(apiClient.getErrorMessage(err));
      setRefunding(false);
    }
  };

  const p = data;
  const stripe = p?.stripe;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label="Payment detail"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-xl overflow-y-auto border-l border-mono-light-grey bg-mono-dark p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold uppercase text-white">Payment Detail</h2>
            <p className="mt-1 font-mono text-xs text-mono-light-grey">{id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="border border-mono-light-grey p-2 hover:bg-white hover:text-black"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {loading && <p className="py-8 text-center text-mono-light-grey">Loading…</p>}
        {error && (
          <div role="alert" className="border border-red-400 p-4 text-sm text-white">
            {error}
          </div>
        )}

        {p && (
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[11px] uppercase text-mono-light-grey">Booking</dt>
                <dd className="mt-1 font-mono">{p.booking.booking_code}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-mono-light-grey">Status</dt>
                <dd className="mt-1">
                  <span className="border border-mono-light-grey px-2 py-0.5 text-[11px] uppercase">
                    {p.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-mono-light-grey">Customer</dt>
                <dd className="mt-1">
                  {p.booking.user?.name}
                  <span className="block text-mono-light-grey">{p.booking.user?.email}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-mono-light-grey">Event</dt>
                <dd className="mt-1">{p.booking.event?.title}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-mono-light-grey">Amount</dt>
                <dd className="mt-1 font-bold">{formatCurrency(Number(p.amount), p.currency)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-mono-light-grey">Provider</dt>
                <dd className="mt-1 font-mono text-mono-light-grey">{p.provider_tx_id ?? p.provider}</dd>
              </div>
            </dl>

            <section aria-label="Stripe live data" className="border border-mono-dark-grey p-4">
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-mono-light-grey">
                {'// STRIPE_LIVE'}
              </h3>
              {!stripe ? (
                <p className="text-sm text-mono-light-grey">No PaymentIntent data available.</p>
              ) : stripe.unavailable ? (
                <p className="text-sm text-mono-light-grey">{stripe.reason}</p>
              ) : (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[11px] uppercase text-mono-light-grey">Intent status</dt>
                    <dd className="mt-1 font-mono">{stripe.payment_intent_id}</dd>
                    <dd className="mt-1">
                      <span className="border border-mono-light-grey px-2 py-0.5 text-[11px] uppercase">
                        {stripe.status}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase text-mono-light-grey">Amount</dt>
                    <dd className="mt-1 font-bold">{formatCurrency(Number(stripe.amount), p.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase text-mono-light-grey">Fee</dt>
                    <dd className="mt-1">{stripe.fee !== null ? formatCurrency(Number(stripe.fee), p.currency) : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase text-mono-light-grey">Net</dt>
                    <dd className="mt-1">{stripe.net !== null ? formatCurrency(Number(stripe.net), p.currency) : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase text-mono-light-grey">Refunded</dt>
                    <dd className="mt-1">{formatCurrency(Number(stripe.amount_refunded), p.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase text-mono-light-grey">Method</dt>
                    <dd className="mt-1 font-mono">{stripe.payment_method_types?.join(', ') ?? '—'}</dd>
                  </div>
                </dl>
              )}
            </section>

            {p.refunds?.length > 0 && (
              <section aria-label="Refunds" className="border border-mono-dark-grey p-4">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-mono-light-grey">
                  {'// REFUNDS'}
                </h3>
                <ul className="space-y-2 text-sm">
                  {p.refunds.map((r: any) => (
                    <li key={r.id} className="flex items-center justify-between gap-3">
                      <span className="font-mono">{r.id.slice(-8)}</span>
                      <span className="border border-mono-light-grey px-2 py-0.5 text-[11px] uppercase">
                        {r.status}
                      </span>
                      <span className="font-bold">{formatCurrency(Number(r.amount), p.currency)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {p.status === 'COMPLETED' && (
              <section
                aria-label="Admin refund"
                className="border border-red-400/60 p-4"
              >
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-red-300">
                  {'// MANUAL_REFUND'}
                </h3>
                <p className="mt-2 text-xs text-mono-light-grey">
                  Initiates a refund through the normal policy &amp; approval state machine.
                </p>
                <label className="mt-3 block text-xs font-bold uppercase" htmlFor="refund-note">
                  Justification note *
                </label>
                <textarea
                  id="refund-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Reason for admin-initiated refund"
                  className="mt-2 w-full border border-mono-light-grey bg-black p-3 text-sm text-white outline-none"
                />
                {refundError && (
                  <p role="alert" className="mt-2 text-sm text-red-300">
                    {refundError}
                  </p>
                )}
                {confirming ? (
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={refunding}
                      onClick={() => void refund()}
                      className="min-h-touch border border-red-400 px-4 py-2 text-xs font-bold uppercase text-red-300 hover:bg-red-400 hover:text-black disabled:opacity-50"
                    >
                      {refunding ? 'Processing…' : 'Confirm refund'}
                    </button>
                    <button
                      type="button"
                      disabled={refunding}
                      onClick={() => setConfirming(false)}
                      className="min-h-touch border border-mono-light-grey px-4 py-2 text-xs font-bold uppercase disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="mt-3 min-h-touch border border-red-400 px-4 py-2 text-xs font-bold uppercase text-red-300 hover:bg-red-400 hover:text-black"
                  >
                    Initiate refund
                  </button>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
