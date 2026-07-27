'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, Ticket } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar links={[]} showAuth={true} />
      
      <div className="container mx-auto px-4 py-20 flex items-center justify-center min-h-[80vh]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black border border-green-500/50 p-8 md:p-12 text-center max-w-2xl w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-black" aria-hidden="true" />
          </motion.div>
          
          <h2 className="font-display font-bold text-3xl md:text-4xl uppercase text-white mb-4">Payment Successful!</h2>
          <p className="text-mono-light-grey uppercase tracking-widest text-sm md:text-base mb-8">
            Your booking has been confirmed and tickets are generated.
          </p>

          <div className="bg-white/5 p-6 mb-8 inline-block w-full border border-mono-dark-grey">
            <div className="text-xs text-mono-light-grey uppercase tracking-widest mb-2">Stripe Session ID</div>
            <div className="text-sm font-mono text-[#CCCCCC] break-all">
              {sessionId || 'N/A'}
            </div>
          </div>

          <p className="text-sm text-mono-light-grey mb-8">
            You can view and download your e-tickets from your dashboard.
          </p>

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
