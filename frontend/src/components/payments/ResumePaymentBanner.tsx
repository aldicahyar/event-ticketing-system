'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Clock, ArrowRight, Loader2 } from 'lucide-react';
import {
  useResumablePayments,
  type ResumableSession,
} from '@/hooks/useResumablePayments';

function formatCountdown(seconds: number) {
  if (seconds <= 0) return '0m 0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function secondsLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 1000));
}

interface ResumePaymentBannerProps {
  /** Called when a session resolves (paid/expired) so the host can refresh. */
  onResolved?: (booking_id: string) => void;
}

/**
 * Banner that surfaces the current user's unfinished Stripe checkout
 * sessions with a prominent "Continue Payment" button for each.
 *
 * - Appears only when there is at least one server-validated resumable
 *   session (link still active and not expired).
 * - Polls every 20s and on tab refocus, so once payment succeeds the banner
 *   disappears automatically (near real-time).
 * - Survives browser cache clears because it reads from the server-side
 *   booking record, not localStorage.
 */
export function ResumePaymentBanner({ onResolved }: ResumePaymentBannerProps) {
  const { sessions, isLoading } = useResumablePayments({
    intervalMs: 20000,
    onResolved,
  });

  // 1s ticker so the countdown animates; only runs while there are sessions.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (sessions.length === 0) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [sessions.length]);

  if (sessions.length === 0) {
    // Subtle "checking…" hint on the very first load; nothing otherwise.
    if (!isLoading) return null;
    return (
      <div className="flex items-center gap-2 text-mono-light-grey text-xs uppercase tracking-widest">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        Checking for unfinished payments…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {sessions.map((s: ResumableSession) => {
          const remaining = secondsLeft(s.expires_at);
          const urgent = remaining != null && remaining < 5 * 60;
          return (
            <motion.div
              key={s.booking_id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="status"
              className={`border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                urgent
                  ? 'border-yellow-500/60 bg-yellow-500/5'
                  : 'border-white/30 bg-white/5'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 flex items-center justify-center shrink-0 ${
                    urgent ? 'bg-yellow-500 text-black' : 'bg-white text-black'
                  }`}
                  aria-hidden="true"
                >
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-widest text-yellow-400 mb-1">
                    Please proceed with the payment
                  </div>
                  <div className="font-bold text-white truncate">
                    {s.event_title}
                  </div>
                  <div className="text-xs text-mono-light-grey">
                    {s.booking_code} · {s.currency}{' '}
                    {Number(s.total_price).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {remaining != null && (
                  <span
                    className={`text-xs uppercase font-bold inline-flex items-center gap-1 ${
                      urgent ? 'text-yellow-400 animate-pulse' : 'text-white'
                    }`}
                  >
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {formatCountdown(remaining)}
                  </span>
                )}
                <a
                  href={s.checkout_url}
                  className="px-5 py-3 bg-white text-black font-bold uppercase tracking-wide text-sm hover:bg-transparent hover:text-white border-2 border-white transition-all inline-flex items-center gap-2 min-h-touch"
                >
                  Continue Payment
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
