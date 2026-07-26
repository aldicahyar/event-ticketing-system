'use client';

import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

export default function AdminStatsPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-bold text-2xl md:text-4xl uppercase text-white mb-2">
          Admin <span className="text-transparent stroke-text" style={{ WebkitTextStroke: '2px white' }}>Stats</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
          {'// PLATFORM_KPI_DASHBOARD'}
        </p>
      </motion.div>

      <div className="bg-black border border-mono-dark-grey p-8 text-center">
        <BarChart3 className="w-12 h-12 text-mono-dark-grey mx-auto mb-4" aria-hidden="true" />
        <h2 className="font-display font-bold text-xl uppercase text-white mb-2">Coming Soon</h2>
        <p className="text-mono-light-grey text-sm max-w-md mx-auto">
          KPI cards (Total Events, Venues, Users, Revenue), charts, and trend breakdowns will be wired here.
        </p>
      </div>
    </div>
  );
}
