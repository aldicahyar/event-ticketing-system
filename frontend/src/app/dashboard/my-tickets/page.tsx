'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Ticket, Clock, Download, QrCode, MapPin, Calendar,
  AlertTriangle, Loader2, ArrowRight, CreditCard
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { TicketCardSkeleton } from '@/components/ui/skeleton';
import { useResumablePayments } from '@/hooks/useResumablePayments';

interface TicketSeat {
  id: string;
  row: string;
  number: number;
  type: 'REGULAR' | 'VIP' | 'PREMIUM';
}

interface TicketItem {
  id: string;
  seat_id: string;
  qr_code: string;
  is_checked_in: boolean;
}

interface TicketEvent {
  id: string;
  title: string;
  description?: string;
  event_date?: string;
  start_date_time: string;
  end_date_time?: string;
  image_url?: string | null;
  venue?: {
    id: string;
    name: string;
    city: string;
    address: string;
  } | null;
}

interface TicketBooking {
  id: string;
  booking_code: string;
  total_price: string | number;
  currency: string;
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
  booked_at?: string;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  expires_at?: string | null;
  event: TicketEvent;
  seats: TicketSeat[];
  tickets: TicketItem[];
}

type FocusedStatus =
  | { state: 'loading' }
  | { state: 'ready'; booking: TicketBooking }
  | { state: 'error'; message: string }
  | { state: 'absent' };

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

function TicketsContent() {
  const searchParams = useSearchParams();
  const focusOrderId = searchParams.get('order');

  const [bookings, setBookings] = useState<TicketBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [focused, setFocused] = useState<FocusedStatus>({ state: 'absent' });
  const [, setTick] = useState(0);
  // Re-entry guard so the 1s expiry ticker + the resumable-payments poll can't
  // fire overlapping silent refreshes (which would otherwise cause duplicate
  // concurrent requests and re-render churn during the PENDING -> EXPIRED window).
  const refreshingRef = useRef(false);

  const loadTickets = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      // Silent refresh keeps the existing list mounted (no skeleton flash) —
      // used for automatic status updates (expiry transition, polling).
      if (!opts.silent) setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<TicketBooking[]>('/bookings/my-tickets');
        setBookings(data ?? []);
      } catch (err) {
        setError(apiClient.getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const loadFocusedOrder = useCallback(
    async (orderId: string, opts: { silent?: boolean } = {}) => {
      // Silent refresh keeps the existing PENDING banner mounted until the
      // fresh (EXPIRED) data arrives, so the banner swaps state in place
      // instead of flashing a loading spinner — this fixes the expiry blink.
      if (!opts.silent) setFocused({ state: 'loading' });
      try {
        const order = await apiClient.get<TicketBooking>(
          `/bookings/my-orders/${encodeURIComponent(orderId)}`,
        );
        if (!order) {
          setFocused({ state: 'error', message: 'Order not found' });
          return;
        }
        setFocused({ state: 'ready', booking: order });
      } catch (err: any) {
        setFocused({
          state: 'error',
          message:
            apiClient.getErrorMessage(err) ||
            'Could not load the requested order details.',
        });
      }
    },
    [],
  );

  // Shared silent refresh used by both the expiry ticker and the
  // resumable-payments poll. It is guarded by refreshingRef so concurrent
  // triggers collapse into a single in-flight request.
  const refreshSilently = useCallback(
    async (bookingId?: string) => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      try {
        const tasks: Promise<unknown>[] = [loadTickets({ silent: true })];
        if (bookingId) tasks.push(loadFocusedOrder(bookingId, { silent: true }));
        await Promise.all(tasks);
      } finally {
        refreshingRef.current = false;
      }
    },
    [loadTickets, loadFocusedOrder],
  );

  // Surface server-validated resumable Stripe sessions so a PENDING focused
  // order can show a "Continue Payment" button in the action menu. When a
  // session resolves (paid/expired) we silently reload so the button hides
  // without flickering the UI.
  const { getByBookingId } = useResumablePayments({
    intervalMs: 20000,
    onResolved: (booking_id) => {
      void refreshSilently(booking_id === focusOrderId ? booking_id : undefined);
    },
  });

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!focusOrderId) {
      setFocused({ state: 'absent' });
      return;
    }
    loadFocusedOrder(focusOrderId);
  }, [focusOrderId, loadFocusedOrder]);

  // Realtime countdown ticker for PENDING booking expires_at, plus auto-refresh
  // when the 15-min window lapses so the EXPIRED banner replaces the PENDING one.
  useEffect(() => {
    let cancelled = false;
    const id = window.setInterval(() => {
      if (cancelled) return;
      setTick((t) => t + 1);
      if (focused.state === 'ready' && focused.booking.status === 'PENDING') {
        const exp = focused.booking.expires_at
          ? new Date(focused.booking.expires_at).getTime()
          : NaN;
        if (!isNaN(exp) && Date.now() >= exp && focusOrderId) {
          // Silent refresh so the banner swaps PENDING -> EXPIRED in place
          // (no loading-spinner flash). Guarded so the 1s ticker can't stack
          // duplicate requests while the refresh is in flight.
          void refreshSilently(focusOrderId);
        }
      }
    }, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [focused, focusOrderId, refreshSilently]);

  const isUpcoming = (b: TicketBooking) => {
    // The actual event date lives in event_date; start_date_time is the ticket
    // sales-open date. Match the convention used across the app (checkout/events).
    const iso = b.event?.event_date ?? b.event?.start_date_time;
    const eventDate = iso ? new Date(iso) : null;
    return eventDate ? eventDate.getTime() >= Date.now() : false;
  };

  const filteredTickets = bookings.filter((b) =>
    filter === 'upcoming' ? isUpcoming(b) : !isUpcoming(b),
  );


  const statusBadge = (status?: string) => {
    switch (status) {
      case 'CONFIRMED':
        return { className: 'bg-green-500 text-black', label: 'Confirmed' };
      case 'PENDING':
        return { className: 'bg-yellow-500 text-black', label: 'Pending' };
      case 'EXPIRED':
        return { className: 'bg-red-500 text-white', label: 'Expired' };
      case 'CANCELLED':
        return { className: 'bg-mono-dark-grey text-white', label: 'Cancelled' };
      default:
        return { className: 'bg-mono-dark-grey text-white', label: status ?? 'Unknown' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display font-bold text-4xl uppercase text-white mb-2">
          My <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Tickets</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-sm">
          {'// YOUR_E_TICKETS_AND_PASSES'}
        </p>
      </motion.div>

      {/* Focused Order Banner (renders when user lands with ?order=) */}
      {focusOrderId && focused.state !== 'absent' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {focused.state === 'loading' && (
            <div className="border border-mono-dark-grey bg-white/5 p-5 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span className="text-xs uppercase tracking-widest text-mono-light-grey">
                Loading order {focusOrderId}…
              </span>
            </div>
          )}

          {focused.state === 'error' && (
            <div className="border border-red-500/50 bg-red-500/5 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase tracking-widest text-red-400 mb-1">
                    Order unavailable
                  </div>
                  <div className="text-sm text-[#CCCCCC]">{focused.message}</div>
                  <Link
                    href="/dashboard/orders"
                    className="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase underline text-white hover:text-white/80"
                  >
                    Back to Order History <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {focused.state === 'ready' &&
            focused.booking.status !== 'CONFIRMED' && (
              <div
                className={`border ${
                  focused.booking.status === 'EXPIRED'
                    ? 'border-red-500/50 bg-red-500/5'
                    : focused.booking.status === 'CANCELLED'
                    ? 'border-mono-dark-grey bg-white/5'
                    : 'border-yellow-500/50 bg-yellow-500/5'
                } p-5`}
              >
                <div className="flex items-start gap-3">
                  {focused.booking.status === 'EXPIRED' ||
                  focused.booking.status === 'CANCELLED' ? (
                    <AlertTriangle
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        focused.booking.status === 'EXPIRED'
                          ? 'text-red-400'
                          : 'text-mono-light-grey'
                      }`}
                    />
                  ) : (
                    <CreditCard className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span
                        className={`px-2 py-1 text-xs font-bold uppercase ${
                          statusBadge(focused.booking.status).className
                        }`}
                      >
                        {statusBadge(focused.booking.status).label}
                      </span>
                      <span className="font-bold uppercase text-white">
                        {focused.booking.booking_code}
                      </span>
                      <span className="text-xs text-mono-light-grey">
                        {focused.booking.event?.title.toUpperCase() ?? 'Unknown event'}
                      </span>
                    </div>

                    {focused.booking.status === 'EXPIRED' && (() => {
                      const expStr = formatDateTimeLocal(focused.booking.expires_at);
                      return (
                        <div className="mb-3 space-y-2">
                          <p className="text-sm text-[#CCCCCC]">
                            This booking is <span className="font-bold uppercase text-red-400">expired</span>.
                            Your previously reserved seats have been released back
                            because payment was not completed within the reservation window.
                          </p>
                          {expStr && (
                            <p className="text-xs text-mono-light-grey uppercase tracking-wider">
                              Expired on: <span className="text-white">{expStr}</span>
                            </p>
                          )}
                          <p className="text-xs text-[#999]">
                            No e-ticket was issued for an expired booking.
                            If you believe you have already been charged for this order,
                            please contact customer support and include this booking code.
                          </p>
                        </div>
                      );
                    })()}
                    {focused.booking.status === 'PENDING' && (() => {
                      const expIso = focused.booking.expires_at;
                      const expMs = expIso ? new Date(expIso).getTime() : NaN;
                      const remaining = isNaN(expMs) ? -1 : expMs - Date.now();
                      const expStr = formatDateTimeLocal(expIso);
                      const isUrgent = remaining >= 0 && remaining < 5 * 60 * 1000;
                      return (
                        <div className="mb-3 space-y-3">
                          <p className="text-sm text-[#CCCCCC]">
                            Your booking is currently{' '}
                            <span className="font-bold uppercase text-yellow-400">awaiting payment</span>.
                            Complete your payment before the reservation window closes,
                            or your seats will be released.
                          </p>
                          {!isNaN(expMs) && (
                            <div
                              className={`flex flex-wrap items-center gap-x-4 gap-y-2 p-3 border ${
                                remaining < 0
                                  ? 'border-red-500/40 bg-red-500/5'
                                  : isUrgent
                                  ? 'border-yellow-500/60 bg-yellow-500/10'
                                  : 'border-mono-dark-grey bg-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Clock
                                  className={`w-4 h-4 ${
                                    remaining < 0
                                      ? 'text-red-400'
                                      : isUrgent
                                      ? 'text-yellow-400'
                                      : 'text-white'
                                  }`}
                                />
                                <span className="text-xs uppercase tracking-widest text-mono-light-grey">
                                  Payment window:
                                </span>
                              </div>
                              <div
                                className={`font-display font-bold text-lg uppercase ${
                                  remaining < 0
                                    ? 'text-red-400 line-through'
                                    : isUrgent
                                    ? 'text-yellow-400 animate-pulse'
                                    : 'text-white'
                                }`}
                              >
                                {remaining < 0
                                  ? 'Window closed — waiting for status refresh'
                                  : formatCountdown(remaining)}
                              </div>
                              {expStr && (
                                <div className="text-xs text-mono-light-grey ml-auto">
                                  (Deadline:{' '}
                                  <span className="text-white">{expStr}</span>)
                                </div>
                              )}
                            </div>
                          )}
                          <ul className="text-xs text-[#CCCCCC] space-y-1 list-disc list-inside">
                            <li>
                              If you already{' '}
                              <span className="font-bold text-white">completed checkout</span> at
                              Stripe: wait 1–2 minutes, then click the{' '}
                              <span className="font-bold text-white">Refresh Tickets</span> button
                              below — e-tickets are usually issued within seconds.
                            </li>
                            <li>
                              If you{' '}
                              <span className="font-bold text-white">have not paid yet</span> or closed
                              the payment tab before finishing: return to the{' '}
                              <span className="font-bold text-white">event page</span> and re-book your
                              seats before someone else takes them.
                            </li>
                            <li>
                              After a successful payment, the status will change to{' '}
                              <span className="font-bold uppercase text-green-400">Confirmed</span> and
                              e-tickets with unique QR codes will appear automatically.
                            </li>
                          </ul>
                        </div>
                      );
                    })()}
                    {focused.booking.status === 'CANCELLED' && (
                      <div className="mb-3 space-y-2">
                        <p className="text-sm text-[#CCCCCC]">
                          This booking has been{' '}
                          <span className="font-bold uppercase">cancelled</span>.
                          No e-tickets are available for a cancelled booking.
                        </p>
                        {focused.booking.cancelled_at && (
                          <p className="text-xs text-mono-light-grey uppercase tracking-wider">
                            Cancelled on:{' '}
                            <span className="text-white">
                              {formatDateTimeLocal(focused.booking.cancelled_at)}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                    {focused.booking.status === 'REFUNDED' && (
                      <div className="mb-3 space-y-2">
                        <p className="text-sm text-[#CCCCCC]">
                          This booking has been{' '}
                          <span className="font-bold uppercase text-[#8b5cf6]">refunded</span>.
                          Seats were released and no e-tickets are available.
                        </p>
                        {focused.booking.cancelled_at && (
                          <p className="text-xs text-mono-light-grey uppercase tracking-wider">
                            Refunded on:{' '}
                            <span className="text-white">
                              {formatDateTimeLocal(focused.booking.cancelled_at)}
                            </span>
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <Link
                        href="/dashboard/orders"
                        className="px-4 py-2 border border-mono-dark-grey text-[#CCCCCC] text-xs font-bold uppercase hover:border-white hover:text-white transition-all inline-flex items-center gap-2"
                      >
                        All Orders
                      </Link>
                      {focused.booking.status === 'PENDING' && (
                        <>
                          {(() => {
                            const resumable = getByBookingId(focused.booking.id);
                            return resumable ? (
                              <a
                                href={resumable.checkout_url}
                                className="px-4 py-2 bg-white text-black border border-white text-xs font-bold uppercase hover:bg-transparent hover:text-white transition-all inline-flex items-center gap-2"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                Continue Payment <ArrowRight className="w-3 h-3" />
                              </a>
                            ) : null;
                          })()}
                          <button
                            type="button"
                            onClick={() => {
                              loadTickets();
                              loadFocusedOrder(focusOrderId);
                            }}
                            className="px-4 py-2 bg-white text-black border border-white text-xs font-bold uppercase hover:bg-transparent hover:text-white transition-all inline-flex items-center gap-2"
                          >
                            <Loader2 className="w-3.5 h-3.5" />
                            Refresh Tickets
                          </button>
                          {focused.booking.event?.id && (
                            <Link
                              href={`/events/${focused.booking.event.id}`}
                              className="px-4 py-2 border border-white bg-transparent text-white text-xs font-bold uppercase hover:bg-white hover:text-black transition-all inline-flex items-center gap-2"
                            >
                              Back to Event Page <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                        </>
                      )}
                      {focused.booking.status === 'EXPIRED' && focused.booking.event?.id && (
                        <Link
                          href={`/events/${focused.booking.event.id}`}
                          className="px-4 py-2 bg-white text-black border border-white text-xs font-bold uppercase hover:bg-transparent hover:text-white transition-all inline-flex items-center gap-2"
                        >
                          Book Again <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {focused.state === 'ready' && focused.booking.status === 'CONFIRMED' && (
            <div className="border border-green-500/50 bg-green-500/5 p-4 flex items-center gap-3">
              <QrCode className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div className="min-w-0 flex-1 text-sm">
                <span className="text-xs uppercase tracking-widest text-green-400 block mb-1">
                  Highlighted order
                </span>
                Showing e-tickets for{' '}
                <span className="font-bold uppercase text-white">
                  {focused.booking.booking_code}
                </span>{' '}
                below.
              </div>
              <Link
                href="/dashboard/orders"
                className="text-xs font-bold uppercase underline text-mono-light-grey hover:text-white"
              >
                All Orders
              </Link>
            </div>
          )}
        </motion.div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['upcoming', 'past'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-6 py-3 text-sm font-bold uppercase border transition-all whitespace-nowrap ${
              filter === f
                ? 'bg-white text-black border-white'
                : 'bg-black text-[#CCCCCC] border-mono-dark-grey hover:border-white'
            }`}
          >
            {f === 'upcoming' ? 'Upcoming' : 'Past Events'}
          </button>
        ))}
      </div>

      {/* Loading - skeleton mirrors the ticket card layout */}
      {isLoading && (
        <div className="space-y-6" aria-busy="true" aria-live="polite">
          <TicketCardSkeleton />
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="text-center py-12 border border-red-500/50 bg-red-500/5">
          <p className="text-red-400 text-sm uppercase tracking-widest mb-2">Failed to load tickets</p>
          <p className="text-mono-light-grey text-sm mb-4">{error}</p>
          <button
            onClick={() => loadTickets()}
            className="inline-block px-6 py-3 bg-white text-black font-bold uppercase tracking-wide"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tickets */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {filteredTickets.map((ticket, index) => {
            const eventIso = ticket.event?.event_date ?? ticket.event?.start_date_time;
            const startDate = eventIso ? new Date(eventIso) : null;
            const isFocused =
              focused.state === 'ready' && focused.booking.id === ticket.id;
            return (
              <motion.div
                key={ticket.id}
                id={`booking-${ticket.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * (index + 1) }}
                className={`bg-black border ${
                  isFocused ? 'border-green-500/80 ring-1 ring-green-500/30' : 'border-mono-dark-grey'
                }`}
              >
                {/* Event Header */}
                <div className="relative">
                  {ticket.event?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ticket.event.image_url}
                      alt={ticket.event.title}
                      className="w-full h-48 object-cover opacity-40 grayscale"
                    />
                  ) : (
                    <div className="w-full h-48 bg-white/5 flex items-center justify-center">
                      <Ticket className="w-12 h-12 text-mono-light-grey" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 mb-2">
                      {ticket.seats[0] && (
                        <span className="px-2 py-1 bg-white text-black text-xs font-bold uppercase">
                          {ticket.seats[0].type}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-green-500 text-black text-xs font-bold uppercase">
                        {isUpcoming(ticket) ? 'Upcoming' : 'Past'}
                      </span>
                    </div>
                    <h2 className="font-display font-bold text-2xl md:text-3xl uppercase text-white">
                      {ticket.event?.title ?? 'Unknown event'}
                    </h2>
                    {ticket.event?.venue && (
                      <p className="text-sm text-mono-light-grey uppercase tracking-widest">
                        {ticket.event.venue.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left - Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-white" />
                      <div>
                        <div className="text-xs text-mono-light-grey uppercase">Date</div>
                        <div className="font-bold">
                          {startDate
                            ? startDate.toLocaleDateString('en-GB', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </div>
                      </div>
                    </div>
                    {startDate && (
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-white" />
                        <div>
                          <div className="text-xs text-mono-light-grey uppercase">Time</div>
                          <div className="font-bold">
                            {startDate.toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' WIB'}
                          </div>
                        </div>
                      </div>
                    )}
                    {ticket.event?.venue && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-white mt-0.5" />
                        <div>
                          <div className="text-xs text-mono-light-grey uppercase">Venue</div>
                          <div className="font-bold uppercase">{ticket.event.venue.name}</div>
                          <div className="text-xs text-[#CCCCCC]">{ticket.event.venue.address}</div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <QrCode className="w-5 h-5 text-white" />
                      <div>
                        <div className="text-xs text-mono-light-grey uppercase">Order Code</div>
                        <div className="font-bold">{ticket.booking_code}</div>
                      </div>
                    </div>
                  </div>

                  {/* Right - QR Codes */}
                  <div>
                    <h3 className="font-bold uppercase text-white mb-3 flex items-center gap-2">
                      <QrCode className="w-5 h-5" />
                      Your Tickets ({ticket.seats.length})
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {ticket.seats.map((seat, idx) => {
                        const tick =
                          ticket.tickets.find((t) => t.seat_id === seat.id) ??
                          ticket.tickets[idx];
                        return (
                          <div
                            key={seat.id}
                            className="bg-white p-3 border-2 border-black"
                          >
                            <div className="text-center mb-2">
                              <div className="text-xs text-mono-light-grey uppercase mb-1">Seat</div>
                              <div className="font-display font-bold text-xl text-black">
                                Row {seat.row} - No. {seat.number}
                              </div>
                            </div>
                            <div className="bg-black aspect-square flex items-center justify-center">
                              <QrCode className="w-16 h-16 text-white" />
                            </div>
                            <div className="text-center mt-2 text-[10px] text-mono-light-grey font-mono break-all">
                              {tick?.qr_code ?? '—'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-mono-dark-grey flex flex-col sm:flex-row gap-3 justify-between">
                  <div className="flex items-center gap-2 text-sm text-mono-light-grey">
                    <span>Total: {formatCurrency(ticket.total_price, ticket.currency)}</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 border border-mono-dark-grey text-[#CCCCCC] text-xs font-bold uppercase hover:border-white hover:text-white transition-all flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download All
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-white text-black border border-white text-xs font-bold uppercase hover:bg-transparent hover:text-white transition-all flex items-center gap-2"
                    >
                      <QrCode className="w-4 h-4" />
                      Add to Wallet
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredTickets.length === 0 && (
        <div className="text-center py-12 border border-mono-dark-grey">
          <Ticket className="w-12 h-12 text-mono-dark-grey mx-auto mb-4" />
          <h3 className="font-bold uppercase text-white mb-2">No tickets yet</h3>
          <p className="text-mono-light-grey text-sm mb-4">
            Purchase tickets to see them here
          </p>
          <Link
            href="/events"
            className="inline-block px-6 py-3 bg-white text-black font-bold uppercase tracking-wide"
          >
            Browse Events
          </Link>
        </div>
      )}
    </div>
  );
}

export default function MyTicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-6" aria-busy="true" aria-live="polite">
            <TicketCardSkeleton />
          </div>
        </div>
      }
    >
      <TicketsContent />
    </Suspense>
  );
}
