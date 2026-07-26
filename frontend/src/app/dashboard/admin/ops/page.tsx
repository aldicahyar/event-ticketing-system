'use client';

import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';

export default function AdminOpsPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-bold text-2xl md:text-4xl uppercase text-white mb-2">
          Operations <span className="text-transparent stroke-text" style={{ WebkitTextStroke: '2px white' }}>Center</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
          {'// ITEMS_REQUIRING_ATTENTION'}
        </p>
      </motion.div>

      <div className="bg-black border border-mono-dark-grey p-8 text-center">
        <ClipboardList className="w-12 h-12 text-mono-dark-grey mx-auto mb-4" aria-hidden="true" />
        <h2 className="font-display font-bold text-xl uppercase text-white mb-2">Coming Soon</h2>
        <p className="text-mono-light-grey text-sm max-w-md mx-auto">
          Pending approvals, low-stock events, expiring soon, failed payments — actionable items surfaced in one queue.
        </p>
      </div>
    </div>
  );
}
