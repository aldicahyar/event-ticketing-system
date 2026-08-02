'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Ticket, Calendar, CreditCard, Download,
  Search, Eye, ArrowRight, Clock,
  CheckCircle, AlertCircle, X, Loader2, Ban,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { OrderRowSkeleton } from '@/components/ui/skeleton';

// Shape mirrors the Prisma booking payload returned by /bookings/my-orders
interface OrderSeat {
  id: string;
  row: string;
  number: number;
  type: 'REGULAR' | 'VIP' | 'PREMIUM';
  price: string | number;
}

interface OrderPayment {
  id: string;
  amount: string | number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  provider: string;
}

interface OrderEvent {
  id: string;
  title: string;
  description?: string;
  start_date_time: string;
  image_url?: string | null;
  venue?: {
    id: string;
    name: string;
    city: string;
    address: string;
  } | null;
}

interface Order {
  id: string;
  booking_code: string;
  user_id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  total_price: string | number;
  currency: string;
  booked_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  expires_at: string | null;
  event: OrderEvent;
  seats: OrderSeat[];
  payment: OrderPayment | null;
  _count?: { tickets: number };
}

type FilterKey = 'all' | 'upcoming' | 'completed' | 'cancelled';

type Toast = { type: 'success' | 'error'; msg: string };

/** Dropdown options matching the backend CANCEL_REASON_CODES. */
const CANCEL_REASONS: { value: string; label: string }[] = [
  { value: 'CHANGE_OF_PLANS', label: 'Change of Plans' },
  { value: 'SCHEDULE_CONFLICT', label: 'Schedule Conflict' },
  { value: 'FOUND_ALTERNATIVE', label: 'Found Alternative' },
  { value: 'NO_LONGER_INTERESTED', label: 'No Longer Interested' },
  { value: 'PAYMENT_ISSUE', label: 'Payment Issue' },
  { value: 'OTHER', label: 'Other' },
];

function formatDateTimeLocal(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCountdown(ms: number) {
  if (ms <= 0) return '0m 0s';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setTick] = useState(0);
  // Re-entry guard so the expiry timer and the resumable-payments poll can't
  // fire overlapping silent refreshes (which would cause duplicate requests
  // and skeleton flicker during the PENDING -> EXPIRED transition).
  const refreshingRef = useRef(false);

  // ── Cancel booking state ──────────────────────────────────────────
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0].value);
  const [cancelDescription, setCancelDescription] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((type: Toast['type'], msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const openCancelModal = useCallback((order: Order) => {
    setCancelTarget(order);
    setCancelReason(CANCEL_REASONS[0].value);
    setCancelDescription('');
  }, []);

  const closeCancelModal = useCallback(() => {
    setCancelTarget(null);
    setCancelDescription('');
  }, []);

  const hasPending = orders.some((o) => o.status === 'PENDING');

  const loadOrders = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      // Silent refresh keeps the existing order rows mounted (no skeleton
      // flash) during automatic status updates (expiry transition, polling).
      if (!opts.silent) setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<Order[]>('/bookings/my-orders');
        setOrders(data ?? []);
      } catch (err) {
        setError(apiClient.getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handleCancelBooking = useCallback(async () => {
    if (!cancelTarget) return;
    if (cancelDescription.trim().length < 5) {
      showToast('error', 'Please provide a description (at least 5 characters).');
      return;
    }

    setCancelling(true);
    try {
      await apiClient.post(`/bookings/${cancelTarget.id}/cancel`, {
        reason: cancelReason,
        description: cancelDescription.trim(),
      });
      showToast('success', `Booking ${cancelTarget.booking_code} cancelled. Seats released.`);
      closeCancelModal();
      await loadOrders({ silent: true });
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }, [cancelTarget, cancelReason, cancelDescription, showToast, closeCancelModal, loadOrders]);

  // Silent, guarded refresh shared by the expiry timer and the
  // resumable-payments poll. Concurrent triggers collapse into one request.
  const refreshSilently = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      await loadOrders({ silent: true });
    } finally {
      refreshingRef.current = false;
    }
  }, [loadOrders]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Reload orders once a minute for PENDING bookings (auto-transition to EXPIRED).
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!hasPending) return;
    // When countdown ticks past zero, trigger an actual reload so API
    // (and its Prisma state) is consulted again (booking may be EXPIRED now).
    const expiries = orders
      .filter((o) => o.status === 'PENDING' && o.expires_at)
      .map((o) => new Date(o.expires_at!).getTime());
    const nextExpiry = expiries.length > 0 ? Math.min(...expiries) : Infinity;
    if (!isFinite(nextExpiry)) return;
    const msUntil = Math.max(0, nextExpiry - Date.now() + 1500);
    const handle = window.setTimeout(() => {
      // Silent refresh: swap PENDING -> EXPIRED rows in place without
      // flashing the skeleton loader.
      void refreshSilently();
    }, msUntil);
    return () => window.clearTimeout(handle);
  }, [orders, hasPending, refreshSilently]);

  const deriveStatus = (order: Order): 'upcoming' | 'completed' | 'cancelled' | 'expired' | 'pending' => {
    if (order.status === 'CANCELLED') return 'cancelled';
    if (order.status === 'EXPIRED') return 'expired';
    if (order.status === 'PENDING') return 'pending';
    const event_date = order.event?.start_date_time ? new Date(order.event.start_date_time) : null;
    const now = new Date();
    if (event_date && event_date < now) return 'completed';
    return 'upcoming';
  };

  const filteredOrders = orders.filter((order) => {
    const derived = deriveStatus(order);
    const matchesFilter =
      filter === 'all' ||
      derived === filter ||
      (filter === 'completed' && (derived === 'completed' || derived === 'expired' || derived === 'cancelled'));
    const needle = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !needle ||
      (order.event?.title ?? '').toLowerCase().includes(needle) ||
      (order.booking_code ?? '').toLowerCase().includes(needle);
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-green-500 text-black';
      case 'pending': return 'bg-yellow-500 text-black';
      case 'expired': return 'bg-red-500 text-white';
      case 'completed': return 'bg-[#666] text-white';
      case 'cancelled': return 'bg-mono-dark-grey text-white';
      default: return 'bg-mono-dark-grey text-white';
    }
  };


  const paymentLabel = (p: OrderPayment | null) => {
    if (!p) return '—';
    const status = p.status.toLowerCase();
    return `${p.provider} · ${status}`;
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display font-bold text-4xl uppercase text-white mb-2">
          Order <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>History</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-sm">
          {'// VIEW_AND_MANAGE_YOUR_ORDERS'}
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col md:flex-row gap-4"
      >
        <div className="relative flex-grow">
          <label htmlFor="orders-search" className="sr-only">Search orders</label>
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
          <input
            id="orders-search"
            type="text"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders…"
            className="w-full bg-black border border-white text-white px-12 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'upcoming', 'completed', 'cancelled'] as FilterKey[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-3 text-sm font-bold uppercase border transition-all ${
                filter === f
                  ? 'bg-white text-black border-white'
                  : 'bg-black text-[#CCCCCC] border-mono-dark-grey hover:border-white'
              }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Loading - skeleton mirrors the order card layout to prevent CLS */}
      {isLoading && (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          <OrderRowSkeleton />
          <OrderRowSkeleton />
          <OrderRowSkeleton />
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="text-center py-12 border border-red-500/50 bg-red-500/5">
          <p className="text-red-400 text-sm uppercase tracking-widest mb-2">Failed to load orders</p>
          <p className="text-mono-light-grey text-sm mb-4">{error}</p>
          <button
            onClick={() => loadOrders()}
            className="inline-block px-6 py-3 bg-white text-black font-bold uppercase tracking-wide"
          >
            Retry
          </button>
        </div>
      )}

      {/* Orders List */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {filteredOrders.map((order, index) => {
            const derived = deriveStatus(order);
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * (index + 1) }}
                className="bg-black border border-mono-dark-grey"
              >
                {/* Order Header */}
                <div className="p-4 border-b border-mono-dark-grey flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold uppercase text-white">{order.booking_code}</div>
                      <div className="text-xs text-mono-light-grey">
                        Ordered: {new Date(order.booked_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 text-xs font-bold uppercase ${getStatusColor(derived)}`}>
                      {derived}
                    </span>
                    <Link
                      href={`/dashboard/my-tickets?order=${order.id}`}
                      className="p-2 border border-mono-dark-grey hover:border-white transition-colors"
                      aria-label={`View order ${order.booking_code}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Order Content */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <div className="flex items-start gap-4">
                      {order.event?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={order.event.image_url}
                          alt={order.event.title}
                          className="w-20 h-20 object-cover grayscale"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-white/10 flex items-center justify-center">
                          <Ticket className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-display font-bold uppercase text-white mb-1 truncate">
                          {order.event?.title ?? 'Unknown event'}
                        </h3>
                        {order.event?.venue && (
                          <p className="text-xs text-mono-light-grey mb-2">{order.event.venue.name}</p>
                        )}
                        <div className="flex flex-wrap gap-3 text-xs text-[#CCCCCC]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {order.event?.start_date_time
                              ? new Date(order.event.start_date_time).toLocaleDateString()
                              : '—'}
                          </span>
                          {order.seats[0] && (
                            <span className="flex items-center gap-1">
                              <Ticket className="w-3 h-3" />
                              {order.seats[0].type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between">
                    <div className="text-right mb-4">
                      <div className="text-xl font-display font-bold text-white">
                        {formatCurrency(order.total_price, order.currency)}
                      </div>
                      <div className="text-xs text-mono-light-grey">
                        {order.seats.length} ticket{order.seats.length > 1 ? 's' : ''} • {paymentLabel(order.payment)}
                      </div>

                      {/* Expiry / countdown / cancellation info specific to the booking status */}
                      <div className="mt-2 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs">
                        {order.status === 'PENDING' &&
                          (() => {
                            const expMs = order.expires_at
                              ? new Date(order.expires_at).getTime()
                              : NaN;
                            const remaining = isNaN(expMs) ? -1 : expMs - Date.now();
                            const expStr = formatDateTimeLocal(order.expires_at);
                            const isUrgent = remaining >= 0 && remaining < 5 * 60 * 1000;
                            return (
                              <>
                                <span
                                  className={`uppercase font-bold inline-flex items-center gap-1 ${
                                    remaining < 0
                                      ? 'text-red-400'
                                      : isUrgent
                                      ? 'text-yellow-400'
                                      : 'text-yellow-300'
                                  }`}
                                >
                                  <Clock className="w-3 h-3" />
                                  {remaining < 0
                                    ? 'Payment window closed'
                                    : `Expired in ${formatCountdown(remaining)}`}
                                </span>
                                {expStr && (
                                  <span className="text-mono-light-grey">
                                    (deadline: <span className="text-white">{expStr}</span>)
                                  </span>
                                )}
                                {remaining >= 0 && (
                                  <span className="block w-full text-[11px] text-[#999]">
                                    Past the deadline → seats are released automatically and the booking becomes Expired.
                                  </span>
                                )}
                              </>
                            );
                          })()}

                        {order.status === 'EXPIRED' && (
                          <>
                            <span className="uppercase font-bold text-red-400 inline-flex items-center gap-1">
                              • Expired
                            </span>
                            {formatDateTimeLocal(order.expires_at) && (
                              <span className="text-mono-light-grey">
                                on:{' '}
                                <span className="text-white">
                                  {formatDateTimeLocal(order.expires_at)}
                                </span>
                              </span>
                            )}
                            <span className="block w-full text-[11px] text-[#999]">
                              Payment was not received within the 15-minute window → no e-ticket was issued and seats have been released.
                            </span>
                          </>
                        )}

                        {order.status === 'CANCELLED' && (
                          <>
                            <span className="uppercase font-bold text-[#999] inline-flex items-center gap-1">
                              • Cancelled
                            </span>
                            {formatDateTimeLocal(order.cancelled_at) && (
                              <span className="text-mono-light-grey">
                                on:{' '}
                                <span className="text-white">
                                  {formatDateTimeLocal(order.cancelled_at)}
                                </span>
                              </span>
                            )}
                          </>
                        )}

                        {order.status === 'CONFIRMED' && order.confirmed_at && (
                          <span className="uppercase font-bold text-green-400 text-[11px] inline-flex items-center gap-1">
                            ✓ Confirmed on {formatDateTimeLocal(order.confirmed_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end flex-wrap sm:flex-nowrap">
                      {order.status === 'CONFIRMED' && derived === 'upcoming' && (
                        <Link
                          href={`/dashboard/my-tickets?order=${order.id}`}
                          className="h-10 px-4 bg-white text-black text-xs font-bold uppercase hover:bg-transparent hover:text-white border border-white transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          View Tickets <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                      {order.status === 'EXPIRED' && (
                        <Link
                          href={`/events/${order.event?.id ?? ''}`}
                          className="h-10 px-4 bg-white text-black text-xs font-bold uppercase hover:bg-transparent hover:text-white border border-white transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          Book Again <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                      {order.status === 'PENDING' && (
                        <>
                          <Link
                            href={`/dashboard/my-tickets?order=${order.id}`}
                            className="h-10 px-4 border border-mono-dark-grey text-[#CCCCCC] text-xs font-bold uppercase hover:border-white hover:text-white transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                          >
                            Check Status <ArrowRight className="w-3 h-3" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openCancelModal(order)}
                            className="h-10 px-4 border border-red-500/50 text-red-400 text-xs font-bold uppercase hover:border-red-500 hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                          >
                            <Ban className="w-3 h-3" />
                            Cancel Booking
                          </button>
                        </>
                      )}
                      <button
                        className="h-10 px-4 border border-mono-dark-grey text-[#CCCCCC] text-xs font-bold uppercase hover:border-white hover:text-white transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                        type="button"
                      >
                        <Download className="w-3 h-3" />
                        Invoice
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order Footer */}
                <div className="p-3 bg-white/5 border-t border-mono-dark-grey flex items-center justify-between text-xs text-mono-light-grey">
                  <span>
                    Seats: {order.seats.map((s) => `${s.row}${s.number}`).join(', ') || '—'}
                  </span>
                  <span>{order.event?.venue ? `${order.event.venue.city}` : '—'}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredOrders.length === 0 && (
        <div className="text-center py-12 border border-mono-dark-grey">
          <CreditCard className="w-12 h-12 text-mono-dark-grey mx-auto mb-4" />
          <h3 className="font-bold uppercase text-white mb-2">No orders found</h3>
          <p className="text-mono-light-grey text-sm mb-4">
            {searchQuery ? 'Try adjusting your search' : 'Start shopping to see your orders here'}
          </p>
          <Link
            href="/events"
            className="inline-block px-6 py-3 bg-white text-black font-bold uppercase tracking-wide"
          >
            Browse Events
          </Link>
        </div>
      )}

      {/* ===== Cancel Booking Confirmation Modal ===== */}
      {cancelTarget && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeCancelModal}
          role="presentation"
        >
          <div
            className="bg-black border border-red-500/50 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Cancel booking confirmation"
          >
            <div className="flex justify-between items-start mb-6 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 flex items-center justify-center shrink-0">
                  <Ban className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="font-display font-bold text-xl uppercase text-white">
                  Cancel Booking
                </h2>
              </div>
              <button
                onClick={closeCancelModal}
                aria-label="Close modal"
                className="p-1 hover:bg-white/10 shrink-0"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Booking summary */}
            <div className="mb-5 p-3 border border-mono-dark-grey bg-white/5">
              <p className="text-xs text-mono-light-grey uppercase tracking-widest mb-1">Booking</p>
              <p className="font-bold text-white">{cancelTarget.booking_code}</p>
              <p className="text-sm text-[#CCCCCC]">{cancelTarget.event?.title ?? 'Unknown event'}</p>
              <p className="text-xs text-mono-light-grey mt-1">
                {cancelTarget.seats.length} seat(s):{' '}
                {cancelTarget.seats.map((s) => `${s.row}${s.number}`).join(', ') || '—'}
              </p>
            </div>

            <p className="text-sm text-[#CCCCCC] mb-5">
              This will permanently cancel your booking and release your seats.
              This action cannot be undone.
            </p>

            {/* Reason dropdown */}
            <div className="mb-4">
              <label
                htmlFor="cancel-reason"
                className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2"
              >
                Reason
              </label>
              <select
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-black border border-white text-white px-3 py-2 focus:outline-none focus:border-red-500"
              >
                {CANCEL_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label
                htmlFor="cancel-desc"
                className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2"
              >
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                id="cancel-desc"
                value={cancelDescription}
                onChange={(e) => setCancelDescription(e.target.value)}
                required
                minLength={5}
                maxLength={500}
                rows={3}
                placeholder="Please tell us why you are cancelling…"
                className="w-full bg-black border border-white text-white px-3 py-2 resize-none focus:outline-none focus:border-red-500"
              />
              <p className="text-[10px] text-[#666] mt-1">
                {cancelDescription.length}/500 characters (minimum 5)
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeCancelModal}
                disabled={cancelling}
                className="flex-1 px-4 py-3 border border-mono-dark-grey text-[#CCCCCC] hover:border-white hover:text-white uppercase text-xs font-bold tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelling || cancelDescription.trim().length < 5}
                className="flex-1 px-4 py-3 bg-red-500 text-white border border-red-500 hover:bg-red-600 uppercase text-xs font-bold tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cancelling…
                  </>
                ) : (
                  'Confirm Cancel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 p-4 border max-w-sm flex items-start gap-3 ${
            toast.type === 'success'
              ? 'bg-white text-black border-white'
              : 'bg-red-500/20 text-red-300 border-red-500'
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.type === 'success'
            ? <CheckCircle className="w-5 h-5 shrink-0" />
            : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
