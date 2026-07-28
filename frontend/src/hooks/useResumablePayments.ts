'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';

/**
 * A resumable Stripe Checkout session returned by
 * GET /payments/pending-sessions. The checkout_url is server-validated
 * (Stripe session is `open` and the booking window has not lapsed).
 */
export interface ResumableSession {
  booking_id: string;
  booking_code: string;
  event_id: string;
  event_title: string;
  total_price: number;
  currency: string;
  /** Validated Stripe Checkout URL the user is redirected back to. */
  checkout_url: string;
  session_id?: string;
  /** ISO string of the booking reservation window deadline. */
  expires_at: string | null;
  message: string;
}

interface UseResumablePaymentsOptions {
  /** Poll interval in ms. Defaults to 20000. Set to 0 to disable polling. */
  intervalMs?: number;
  /**
   * Called when a previously-resumable booking drops off the list
   * (e.g. payment succeeded or the session expired), so the caller can
   * refresh its own data and hide the button in near real-time.
   */
  onResolved?: (booking_id: string) => void;
}

/**
 * Fetches and periodically refreshes the current user's unfinished but
 * resumable Stripe checkout sessions.
 *
 * Why this exists: the previous recovery flow relied on a `pendingCheckout`
 * entry in localStorage, which is lost when the user clears their cache or
 * switches devices. This hook reads from the server-side booking record
 * (t_trx_bookings.stripe_session_id), so the "Continue Payment" button
 * surfaces reliably regardless of browser state.
 */
export function useResumablePayments(
  options: UseResumablePaymentsOptions = {},
) {
  const { intervalMs = 20000, onResolved } = options;
  const [sessions, setSessions] = useState<ResumableSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousIdsRef = useRef<Set<string>>(new Set());
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await apiClient.get<ResumableSession[]>(
        '/payments/pending-sessions',
      );
      const list = data ?? [];
      setSessions(list);

      // Detect bookings that were resumable before but are no longer —
      // meaning they were paid, expired, or cancelled. Notify the caller so
      // it can refresh (this is what hides the button in near real-time once
      // a payment succeeds).
      const currentIds = new Set(list.map((s) => s.booking_id));
      const prev = previousIdsRef.current;
      if (prev.size > 0) {
        for (const id of prev) {
          if (!currentIds.has(id)) onResolvedRef.current?.(id);
        }
      }
      previousIdsRef.current = currentIds;
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!intervalMs) return;
    const id = window.setInterval(refresh, intervalMs);
    return () => window.clearInterval(id);
  }, [refresh, intervalMs]);

  // Refresh when the tab regains focus — the user often returns to this page
  // right after completing (or abandoning) payment on the Stripe tab.
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [refresh]);

  /** Find the resumable session (if any) for a given booking id. */
  const getByBookingId = useCallback(
    (booking_id: string) => sessions.find((s) => s.booking_id === booking_id),
    [sessions],
  );

  return { sessions, isLoading, error, refresh, getByBookingId };
}
