'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, Ticket, AlertTriangle, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { apiClient } from '@/lib/api-client';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [mounted, setMounted] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'verifying' | 'verified' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !sessionId) return;

    let cancelled = false;

    async function run() {
      setSyncState('verifying');
      setSyncError(null);
      try {
        // Wait briefly so the client has a valid JWT from storage after redirect
        await new Promise((r) => setTimeout(r, 300));
        const res = await apiClient.post<{
          booking_status: string;
          payment_status: string;
        }>('/payments/verify-session', { session_id: sessionId });
        if (cancelled) return;
        setBookingStatus(res?.booking_status ?? null);
        setSyncState('verified');
        // Payment succeeded — clear the pending checkout context from
        // localStorage so the /checkout/pending recovery banner does not
        // appear on subsequent navigation.
        try {
          localStorage.removeItem('pendingCheckout');
        } catch {
          // ignore
        }
      } catch (err: any) {
        if (cancelled) return;
        const msg =
          apiClient.getErrorMessage(err) ||
          'Verification failed. Your tickets may take a moment to appear in My Tickets.';
        setSyncError(msg);
        setSyncState('error');
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [mounted, sessionId]);

  if (!mounted) return null;

  // Determine if payment was received but booking was expired (auto-refunded)
  const isExpiredAfterPayment =
    syncState === 'verified' &&
    (bookingStatus === 'EXPIRED' ||
      bookingStatus === 'REFUNDED' ||
      bookingStatus === 'CANCELLED');

  const cardBorderClass = isExpiredAfterPayment
    ? 'border-red-500/50'
    : 'border-green-500/50';
  const iconBgClass = isExpiredAfterPayment ? 'bg-red-500' : 'bg-green-500';

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar links={[]} showAuth={true} />
      
      <div className="container mx-auto px-4 py-20 flex items-center justify-center min-h-[80vh]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`bg-black border ${cardBorderClass} p-8 md:p-12 text-center max-w-2xl w-full`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className={`w-20 h-20 ${iconBgClass} rounded-full flex items-center justify-center mx-auto mb-6`}
          >
            {isExpiredAfterPayment ? (
              <AlertTriangle className="w-10 h-10 text-black" aria-hidden="true" />
            ) : (
              <CheckCircle className="w-10 h-10 text-black" aria-hidden="true" />
            )}
          </motion.div>
          
          <h2 className="font-display font-bold text-3xl md:text-4xl uppercase text-white mb-4">
            {isExpiredAfterPayment ? 'Payment Refunded — Booking Expired' : 'Payment Successful!'}
          </h2>
          <p className="text-mono-light-grey uppercase tracking-widest text-sm md:text-base mb-8">
            {isExpiredAfterPayment
              ? 'Your payment was received after the reservation window and has been automatically refunded.'
              : 'Your booking has been confirmed and tickets are generated.'}
          </p>

          <div className="bg-white/5 p-6 mb-6 inline-block w-full border border-mono-dark-grey">
            <div className="text-xs text-mono-light-grey uppercase tracking-widest mb-2">Stripe Session ID</div>
            <div className="text-sm font-mono text-[#CCCCCC] break-all">
              {sessionId || 'N/A'}
            </div>
          </div>

          {syncState === 'verifying' && (
            <div className="mb-8 p-4 border border-mono-dark-grey bg-white/5 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span className="text-xs uppercase tracking-widest text-mono-light-grey">
                Verifying booking with payment provider…
              </span>
            </div>
          )}

          {syncState === 'verified' && isExpiredAfterPayment && (
            <div className="mb-8 p-4 border border-red-500/50 bg-red-500/5 text-left">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-red-400 mb-1">
                    Payment received after expiry
                  </div>
                  <div className="text-sm text-[#CCCCCC]">
                    Booking status:{' '}
                    <span className="font-bold uppercase text-white">{bookingStatus}</span>.
                    The 15-minute reservation window had already lapsed when your payment
                    was processed. Your seats were released and the full amount has been
                    automatically refunded to your original payment method. Refunds
                    typically appear in 5–10 business days. Please place a new booking if
                    you still wish to attend.
                  </div>
                </div>
              </div>
            </div>
          )}

          {syncState === 'verified' && !isExpiredAfterPayment && bookingStatus && (
            <div className="mb-8 p-4 border border-green-500/50 bg-green-500/5 text-left">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-green-400 mb-1">
                    Booking verified
                  </div>
                  <div className="text-sm text-[#CCCCCC]">
                    Status: <span className="font-bold uppercase text-white">{bookingStatus}</span>.
                    You can view and download your e-tickets from your dashboard.
                  </div>
                </div>
              </div>
            </div>
          )}

          {syncState === 'error' && (
            <div className="mb-8 p-4 border border-yellow-500/50 bg-yellow-500/5 text-left">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-yellow-400 mb-1">
                    Could not verify immediately
                  </div>
                  <div className="text-sm text-[#CCCCCC]">
                    {syncError}. Refresh <Link href="/dashboard/my-tickets" className="underline">My Tickets</Link> in a
                    few moments — the webhook may still be processing your payment.
                  </div>
                </div>
              </div>
            </div>
          )}

          {syncState !== 'verifying' && syncState !== 'verified' && (
            <p className="text-sm text-mono-light-grey mb-8">
              You can view and download your e-tickets from your dashboard.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/" 
              className="px-8 py-3 bg-transparent border-2 border-mono-dark-grey text-[#CCCCCC] font-bold uppercase tracking-wide hover:border-white hover:text-white transition-all min-h-touch inline-flex items-center justify-center"
            >
              Back to Home
            </Link>
            <Link 
              href="/dashboard/my-tickets" 
              className="px-8 py-3 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all min-h-touch inline-flex items-center justify-center gap-2"
            >
              <Ticket className="w-4 h-4" />
              View My Tickets
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent animate-spin mx-auto mb-4" />
          <p className="uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
