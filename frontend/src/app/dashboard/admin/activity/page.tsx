'use client';

import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

export default function AdminActivityPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-bold text-2xl md:text-4xl uppercase text-white mb-2">
          Activity <span className="text-transparent stroke-text" style={{ WebkitTextStroke: '2px white' }}>Feed</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
          {'// RECENT_PLATFORM_EVENTS'}
        </p>
      </motion.div>

      <div className="bg-black border border-mono-dark-grey p-8 text-center">
        <Activity className="w-12 h-12 text-mono-dark-grey mx-auto mb-4" aria-hidden="true" />
        <h2 className="font-display font-bold text-xl uppercase text-white mb-2">Coming Soon</h2>
        <p className="text-mono-light-grey text-sm max-w-md mx-auto">
          Real-time timeline: new bookings, registrations, payments, event publishes — filterable by date range and event.
        </p>
      </div>
    </div>
  );
}
