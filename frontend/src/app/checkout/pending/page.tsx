'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Clock, ArrowRight, Loader2, CheckCircle,
  CreditCard, RefreshCw, Ticket, Ban,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';

const CANCEL_REASONS: { value: string; label: string }[] = [
  { value: 'CHANGE_OF_PLANS', label: 'Change of Plans' },
  { value: 'SCHEDULE_CONFLICT', label: 'Schedule Conflict' },
  { value: 'FOUND_ALTERNATIVE', label: 'Found Alternative' },
  { value: 'NO_LONGER_INTERESTED', label: 'No Longer Interested' },
  { value: 'PAYMENT_ISSUE', label: 'Payment Issue' },
  { value: 'OTHER', label: 'Other' },
];

interface PendingCheckoutContext {
  booking_id: string;
  booking_code: string;
  session_id?: string;
  checkout_url?: string;
  expires_at?: string;
  event_id?: string;
  event_title?: string;
  total?: number;
  currency?: string;
  created_at?: string;
}

type RecoverStatus =
  | { state: 'loading' }
  | {
      state: 'result';
      kind: 'confirmed' | 'expired' | 'pending' | 'new_session';
      checkout_url: string | null;
      booking_code: string;
      message: string;
      expires_at: string | null;
    }
  | { state: 'error'; message: string };

function formatCountdown(ms: number) {
  if (ms <= 0) return '0m 0s';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function PendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlBookingId = searchParams.get('booking');

  const [ctx, setCtx] = useState<PendingCheckoutContext | null>(null);
  const [recover, setRecover] = useState<RecoverStatus>({ state: 'loading' });
  const [, setTick] = useState(0);
  const [showNotification, setShowNotification] = useState(true);

  // ── Cancel booking state ──────────────────────────────────────────
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0].value);
  const [cancelDescription, setCancelDescription] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Load pending checkout context from localStorage or URL param
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pendingCheckout');
      if (raw) {
        const parsed: PendingCheckoutContext = JSON.parse(raw);
        setCtx(parsed);
        return;
      }
    } catch {
      // ignore parse error
    }
    if (urlBookingId) {
      setCtx({
        booking_id: urlBookingId,
        booking_code: '',
      });
    }
  }, [urlBookingId]);

  // Call /payments/recover-session to get the live status
  const checkStatus = useCallback(async (bookingId: string) => {
    setRecover({ state: 'loading' });
    try {
      const res = await apiClient.post<{
        status: 'confirmed' | 'expired' | 'pending' | 'new_session';
        booking_code: string;
        checkout_url: string | null;
        message: string;
        expires_at: string | null;
      }>('/payments/recover-session', { booking_id: bookingId });

      setRecover({
        state: 'result',
        kind: res?.status ?? 'expired',
        checkout_url: res?.checkout_url ?? null,
        booking_code: res?.booking_code ?? '',
        message: res?.message ?? '',
        expires_at: res?.expires_at ?? null,
      });
    } catch (err: any) {
      setRecover({
        state: 'error',
        message:
          apiClient.getErrorMessage(err) ||
          'Could not verify your checkout status. Please try again or contact support.',
      });
    }
  }, []);

  useEffect(() => {
    if (ctx?.booking_id) {
      checkStatus(ctx.booking_id);
    }
  }, [ctx?.booking_id, checkStatus]);

  // Derived values for cleaner type narrowing in effects/JSX
  const recoverKind = recover.state === 'result' ? recover.kind : null;
  const recoverExpiresAt =
    recover.state === 'result' ? recover.expires_at : null;
  const recoverCheckoutUrl =
    recover.state === 'result' ? recover.checkout_url : null;

  // Countdown ticker + auto-refresh when expired
  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      if (recoverKind === 'pending' && recoverExpiresAt) {
        const exp = new Date(recoverExpiresAt).getTime();
        if (Date.now() >= exp) {
          if (ctx?.booking_id) checkStatus(ctx.booking_id);
        }
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [recoverKind, recoverExpiresAt, ctx?.booking_id, checkStatus]);

  // Auto-poll every 10s while pending, to catch webhook / cron confirmation
  useEffect(() => {
    if (recoverKind !== 'pending') return;
    const id = window.setInterval(() => {
      if (ctx?.booking_id) checkStatus(ctx.booking_id);
    }, 10000);
    return () => window.clearInterval(id);
  }, [recoverKind, ctx?.booking_id, checkStatus]);

  const handleContinuePayment = () => {
    if (recoverCheckoutUrl) {
      window.location.href = recoverCheckoutUrl;
    }
  };

  const handleClearPending = () => {
    try {
      localStorage.removeItem('pendingCheckout');
    } catch {
      // ignore
    }
    router.push('/dashboard/orders');
  };

  /**
   * Cancel the booking via the real API, then clean up localStorage
   * and redirect to orders. Requires a reason + description.
   */
  const handleConfirmCancel = async () => {
    if (!ctx?.booking_id) return;
    if (cancelDescription.trim().length < 5) {
      setCancelError('Description must be at least 5 characters.');
      return;
    }

    setCancelling(true);
    setCancelError(null);
    try {
      await apiClient.post(`/bookings/${ctx.booking_id}/cancel`, {
        reason: cancelReason,
        description: cancelDescription.trim(),
      });
      handleClearPending();
    } catch (err: any) {
      setCancelError(
        apiClient.getErrorMessage(err) ||
          'Failed to cancel booking. Please try again.',
      );
    } finally {
      setCancelling(false);
    }
  };

  const expiresMs =
    recover.state === 'result' && recover.expires_at
      ? new Date(recover.expires_at).getTime() - Date.now()
      : -1;
  const isUrgent = expiresMs >= 0 && expiresMs < 5 * 60 * 1000;

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar links={[]} showAuth={true} />

      <div className="container mx-auto px-4 py-20 flex items-center justify-center min-h-[80vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black border border-yellow-500/50 p-8 md:p-12 max-w-2xl w-full"
        >
          {/* Header icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <AlertTriangle className="w-10 h-10 text-black" aria-hidden="true" />
          </motion.div>

          <h2 className="font-display font-bold text-3xl md:text-4xl uppercase text-white mb-3 text-center">
            Payment Incomplete
          </h2>
          <p className="text-mono-light-grey uppercase tracking-widest text-sm md:text-base mb-6 text-center">
            Your checkout was not completed. You can resume your payment below.
          </p>

          {/* Info notification banner */}
          {showNotification && (
            <div className="mb-6 p-4 border border-yellow-500/50 bg-yellow-500/5 text-left relative">
              <button
                type="button"
                onClick={() => setShowNotification(false)}
                className="absolute top-2 right-2 text-mono-light-grey hover:text-white text-xs uppercase"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
              <div className="flex items-start gap-3 pr-6">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-yellow-400 mb-1">
                    Payment not finished
                  </div>
                  <div className="text-sm text-[#CCCCCC]">
                    It looks like the payment window was closed before the transaction
                    was completed. Your seats are still reserved for a limited time.
                    Use the <span className="font-bold text-white">Continue Payment</span> button
                    below to resume — you will not need to re-enter your details.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Booking context card */}
          {ctx && (
            <div className="bg-white/5 p-5 mb-6 border border-mono-dark-grey">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-white" />
                <span className="text-xs uppercase tracking-widest text-mono-light-grey">
                  Booking Reference
                </span>
              </div>
              <div className="font-bold text-white text-lg">
                {ctx.booking_code || (recover.state === 'result' ? recover.booking_code : '—')}
              </div>
              {ctx.event_title && (
                <div className="text-sm text-mono-light-grey mt-1">{ctx.event_title}</div>
              )}
              {ctx.total != null && (
                <div className="text-sm text-mono-light-grey mt-1">
                  Total: <span className="text-white font-bold">
                    {formatCurrency(ctx.total ?? 0, ctx.currency)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Loading state */}
          {recover.state === 'loading' && (
            <div className="mb-6 p-4 border border-mono-dark-grey bg-white/5 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span className="text-xs uppercase tracking-widest text-mono-light-grey">
                Verifying checkout status…
              </span>
            </div>
          )}

          {/* Error state */}
          {recover.state === 'error' && (
            <div className="mb-6 p-4 border border-red-500/50 bg-red-500/5 text-left">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-red-400 mb-1">
                    Verification failed
                  </div>
                  <div className="text-sm text-[#CCCCCC]">{recover.message}</div>
                </div>
              </div>
            </div>
          )}

          {/* Result: CONFIRMED */}
          {recover.state === 'result' && recover.kind === 'confirmed' && (
            <div className="mb-6 p-4 border border-green-500/50 bg-green-500/5 text-left">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-green-400 mb-1">
                    Payment confirmed
                  </div>
                  <div className="text-sm text-[#CCCCCC] mb-3">{recover.message}</div>
                  <div className="flex gap-3">
                    <Link
                      href="/dashboard/my-tickets"
                      className="px-4 py-2 bg-white text-black border border-white text-xs font-bold uppercase hover:bg-transparent hover:text-white transition-all inline-flex items-center gap-2"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      View My Tickets
                    </Link>
                    <button
                      type="button"
                      onClick={handleClearPending}
                      className="px-4 py-2 border border-mono-dark-grey text-[#CCCCCC] text-xs font-bold uppercase hover:border-white hover:text-white transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Result: EXPIRED */}
          {recover.state === 'result' && recover.kind === 'expired' && (
            <div className="mb-6 p-4 border border-red-500/50 bg-red-500/5 text-left">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-red-400 mb-1">
                    Reservation expired
                  </div>
                  <div className="text-sm text-[#CCCCCC] mb-3">{recover.message}</div>
                  {ctx?.event_id && (
                    <Link
                      href={`/events/${ctx.event_id}`}
                      className="px-4 py-2 bg-white text-black border border-white text-xs font-bold uppercase hover:bg-transparent hover:text-white transition-all inline-flex items-center gap-2"
                    >
                      Book Again <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Result: PENDING or NEW_SESSION — Continue Payment + Countdown */}
          {(recover.state === 'result' &&
            (recover.kind === 'pending' || recover.kind === 'new_session') && (
              <>
                {/* Countdown */}
                {expiresMs >= 0 && (
                  <div
                    className={`mb-6 p-4 border ${
                      isUrgent
                        ? 'border-yellow-500/60 bg-yellow-500/10'
                        : 'border-mono-dark-grey bg-white/5'
                    } flex flex-wrap items-center gap-x-4 gap-y-2`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock
                        className={`w-5 h-5 ${
                          isUrgent ? 'text-yellow-400' : 'text-white'
                        }`}
                      />
                      <span className="text-xs uppercase tracking-widest text-mono-light-grey">
                        Time remaining:
                      </span>
                    </div>
                    <div
                      className={`font-display font-bold text-lg uppercase ${
                        isUrgent ? 'text-yellow-400 animate-pulse' : 'text-white'
                      }`}
                    >
                      {formatCountdown(expiresMs)}
                    </div>
                  </div>
                )}

                {/* Message */}
                <div className="mb-6 p-4 border border-mono-dark-grey bg-white/5 text-left">
                  <div className="text-sm text-[#CCCCCC]">{recover.message}</div>
                </div>

                {/* Continue Payment / Check Again / Cancel Booking */}
                {!showCancelForm ? (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      type="button"
                      onClick={handleContinuePayment}
                      disabled={!recover.checkout_url}
                      className="px-8 py-3 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all min-h-touch inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CreditCard className="w-4 h-4" />
                      Continue Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => ctx?.booking_id && checkStatus(ctx.booking_id)}
                      className="px-8 py-3 bg-transparent border-2 border-mono-dark-grey text-[#CCCCCC] font-bold uppercase tracking-wide hover:border-white hover:text-white transition-all min-h-touch inline-flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Check Again
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCancelForm(true)}
                      className="px-8 py-3 bg-transparent border-2 border-mono-dark-grey text-mono-light-grey font-bold uppercase tracking-wide hover:border-red-500 hover:text-red-400 transition-all min-h-touch inline-flex items-center justify-center gap-2"
                    >
                      <Ban className="w-4 h-4" />
                      Cancel Booking
                    </button>
                  </div>
                ) : (
                  /* Inline cancel confirmation form */
                  <div className="border border-red-500/50 bg-red-500/5 p-5 text-left">
                    <div className="flex items-center gap-2 mb-4">
                      <Ban className="w-5 h-5 text-red-400" />
                      <span className="text-xs uppercase tracking-widest text-red-400 font-bold">
                        Cancel Booking
                      </span>
                    </div>
                    <p className="text-sm text-[#CCCCCC] mb-4">
                      This will permanently cancel your booking and release your seats.
                    </p>

                    {/* Reason dropdown */}
                    <div className="mb-3">
                      <label
                        htmlFor="pending-cancel-reason"
                        className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2"
                      >
                        Reason
                      </label>
                      <select
                        id="pending-cancel-reason"
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
                    <div className="mb-4">
                      <label
                        htmlFor="pending-cancel-desc"
                        className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2"
                      >
                        Description <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        id="pending-cancel-desc"
                        value={cancelDescription}
                        onChange={(e) => setCancelDescription(e.target.value)}
                        required
                        minLength={5}
                        maxLength={500}
                        rows={2}
                        placeholder="Please tell us why you are cancelling…"
                        className="w-full bg-black border border-white text-white px-3 py-2 resize-none focus:outline-none focus:border-red-500"
                      />
                    </div>

                    {cancelError && (
                      <p className="text-xs text-red-400 mb-3">{cancelError}</p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCancelForm(false);
                          setCancelDescription('');
                          setCancelError(null);
                        }}
                        disabled={cancelling}
                        className="flex-1 px-4 py-3 border border-mono-dark-grey text-[#CCCCCC] hover:border-white hover:text-white uppercase text-xs font-bold tracking-wide transition-all disabled:opacity-30"
                      >
                        Keep Booking
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmCancel}
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
                )}
              </>
            ))}

          {/* No context — no pending checkout found */}
          {!ctx && recover.state !== 'loading' && (
            <div className="mb-6 text-center text-mono-light-grey text-sm">
              <p className="mb-4">
                No pending checkout was found. If you believe this is an error,
                please check your order history.
              </p>
              <Link
                href="/dashboard/orders"
                className="inline-block px-6 py-3 bg-white text-black font-bold uppercase tracking-wide"
              >
                Go to Orders
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function CheckoutPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white border-t-transparent animate-spin mx-auto mb-4" />
            <p className="uppercase tracking-widest">Loading...</p>
          </div>
        </div>
      }
    >
      <PendingContent />
    </Suspense>
  );
}
