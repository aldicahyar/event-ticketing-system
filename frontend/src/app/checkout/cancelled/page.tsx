'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { XCircle, AlertTriangle, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { apiClient } from '@/lib/api-client';

interface BookingSnapshot {
  id: string;
  booking_code: string;
  status: string;
  expires_at: string | null;
  event?: { id: string; title: string } | null;
}

function CancelledContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('booking');
  const [mounted, setMounted] = useState(false);
  const [booking, setBooking] = useState<BookingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // If we have a pending checkout in localStorage for this booking, redirect
  // to /checkout/pending which provides the full "Continue Payment" flow.
  useEffect(() => {
    if (!mounted || !bookingId) return;
    try {
      const raw = localStorage.getItem('pendingCheckout');
      if (raw) {
        const pending = JSON.parse(raw);
        if (pending?.booking_id === bookingId) {
          router.replace('/checkout/pending');
          return;
        }
      }
    } catch {
      // ignore parse error — stay on cancelled page
    }
  }, [mounted, bookingId, router]);

  useEffect(() => {
    if (!mounted || !bookingId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiClient.get<BookingSnapshot>(
          `/bookings/my-orders/${encodeURIComponent(bookingId!)}`,
        );
        if (!cancelled) setBooking(data ?? null);
      } catch {
        if (!cancelled) setBooking(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [mounted, bookingId]);

  if (!mounted) return null;

  const isExpired = booking?.status === 'EXPIRED';
  const isPending = booking?.status === 'PENDING';

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar links={[]} showAuth={true} />

      <div className="container mx-auto px-4 py-20 flex items-center justify-center min-h-[80vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black border border-red-500/50 p-8 md:p-12 text-center max-w-2xl w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <XCircle className="w-10 h-10 text-black" aria-hidden="true" />
          </motion.div>

          <h2 className="font-display font-bold text-3xl md:text-4xl uppercase text-white mb-4">
            Payment Cancelled
          </h2>
          <p className="text-mono-light-grey uppercase tracking-widest text-sm md:text-base mb-6">
            Your checkout session was closed before payment was completed.
          </p>

          {loading && (
            <div className="mb-6 text-mono-light-grey text-sm uppercase tracking-widest">
              Loading booking details…
            </div>
          )}

          {!loading && booking && (
            <div
              className={`p-5 mb-6 text-left border ${
                isExpired
                  ? 'border-red-500/50 bg-red-500/5'
                  : isPending
                  ? 'border-yellow-500/50 bg-yellow-500/5'
                  : 'border-mono-dark-grey bg-white/5'
              }`}
            >
              <div className="flex items-start gap-3">
                {isExpired ? (
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                ) : isPending ? (
                  <Clock className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-mono-light-grey mt-0.5 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 text-xs font-bold uppercase ${
                        isExpired
                          ? 'bg-red-500 text-white'
                          : isPending
                          ? 'bg-yellow-500 text-black'
                          : 'bg-mono-dark-grey text-white'
                      }`}
                    >
                      {booking.status}
                    </span>
                    <span className="font-bold uppercase text-white text-sm">
                      {booking.booking_code}
                    </span>
                  </div>

                  {isExpired && (
                    <p className="text-sm text-[#CCCCCC]">
                      The 15-minute reservation window for this booking has already
                      expired. Your seats were released back to the pool and no payment
                      was taken. Please place a new booking if you still wish to attend.
                    </p>
                  )}
                  {isPending && (
                    <p className="text-sm text-[#CCCCCC]">
                      Your booking is still within the reservation window. You can
                      return to the event page and retry the checkout before the timer
                      runs out.
                    </p>
                  )}
                  {booking.event?.title && (
                    <p className="text-xs text-mono-light-grey mt-2 uppercase tracking-wider">
                      Event: <span className="text-white">{booking.event.title}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!loading && !booking && bookingId && (
            <div className="p-5 mb-6 border border-mono-dark-grey bg-white/5 text-left">
              <p className="text-sm text-[#CCCCCC]">
                We could not load the booking details. If you believe this is an error,
                please contact customer support with your booking reference.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/events"
              className="px-8 py-3 bg-transparent border-2 border-mono-dark-grey text-[#CCCCCC] font-bold uppercase tracking-wide hover:border-white hover:text-white transition-all min-h-touch inline-flex items-center justify-center"
            >
              Browse Events
            </Link>
            {booking?.event?.id && (
              <Link
                href={`/events/${booking.event.id}`}
                className="px-8 py-3 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all min-h-touch inline-flex items-center justify-center gap-2"
              >
                {isExpired ? (
                  <>
                    Book Again <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Retry Checkout
                  </>
                )}
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function CheckoutCancelledPage() {
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
      <CancelledContent />
    </Suspense>
  );
}
