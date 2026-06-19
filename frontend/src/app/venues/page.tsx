'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/ui/Footer';
import { VenueCard } from '@/components/venues/VenueCard';
import {
  VENUES,
  VENUE_CITIES,
  VENUE_TYPES,
  VENUE_TYPE_LABELS,
  VENUE_CAPACITY_BUCKETS,
} from '@/lib/venues-data';

const EASE = [0.16, 1, 0.3, 1] as const;

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

const gridStaggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

const gridItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

export default function VenuesPage() {
  const [city, setCity] = useState('All');
  const [type, setType] = useState<string>('all');
  const [capacity, setCapacity] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const bucket = VENUE_CAPACITY_BUCKETS.find((b) => b.id === capacity)!;
    return VENUES.filter((v) => {
      if (city !== 'All' && v.city !== city) return false;
      if (type !== 'all' && v.type !== type) return false;
      if (v.capacity.total < bucket.min || v.capacity.total > bucket.max) return false;
      if (search) {
        const q = search.trim().toLowerCase();
        const matches =
          v.name.toLowerCase().includes(q) ||
          v.city.toLowerCase().includes(q) ||
          v.shortDescription.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [city, type, capacity, search]);

  const totalCapacity = filtered.reduce((sum, v) => sum + v.capacity.total, 0);
  const totalUpcoming = filtered.reduce((sum, v) => sum + v.upcomingEventsCount, 0);
  const hasActiveFilters = city !== 'All' || type !== 'all' || capacity !== 'all' || search !== '';

  function clearFilters() {
    setCity('All');
    setType('all');
    setCapacity('all');
    setSearch('');
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar
        links={[
          { href: '/events', label: 'Events' },
          { href: '/venues', label: 'Venues' },
          { href: '/lineup', label: 'Lineup' },
          { href: '/help', label: 'Help' },
        ]}
      />

      {/* Hero */}
      <motion.section
        initial="initial"
        animate="animate"
        variants={pageVariants}
        className="pt-32 pb-12 md:pt-40 md:pb-16 border-b border-mono-dark-grey"
        aria-labelledby="venues-heading"
      >
        <div className="container mx-auto px-4 md:px-6">
          <motion.p
            variants={staggerItem}
            className="text-mono-light-grey uppercase tracking-widest text-xs mb-3"
          >
            {"// FIND_YOUR_VENUE"}
          </motion.p>
          <motion.h1
            variants={staggerItem}
            id="venues-heading"
            className="font-display font-bold text-4xl sm:text-6xl md:text-7xl uppercase text-white mb-6"
          >
            Explore{' '}
            <span
              className="text-transparent stroke-text"
              style={{ WebkitTextStroke: '2px white' }}
              aria-hidden="true"
            >
              Venues
            </span>
          </motion.h1>
          <motion.p
            variants={staggerItem}
            className="text-base md:text-lg text-[#CCCCCC] max-w-2xl mb-8"
          >
            Browse our partner venues across Indonesia. From iconic stadiums to intimate clubs, find
            the perfect space for your next live experience.
          </motion.p>

          {/* Stats row — staggered */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-3 gap-4 md:gap-8 border-t border-mono-dark-grey pt-6"
          >
            <motion.div variants={staggerItem}>
              <Stat value={String(filtered.length)} label="Partner Venues" />
            </motion.div>
            <motion.div variants={staggerItem}>
              <Stat value={totalUpcoming.toString()} label="Upcoming Events" />
            </motion.div>
            <motion.div variants={staggerItem}>
              <Stat value={`${Math.round(totalCapacity / 1000)}K`} label="Combined Capacity" />
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Filters */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE, delay: 0.3 } }}
        className="border-b border-mono-dark-grey py-6 sticky top-16 z-30 bg-black/95 backdrop-blur"
        aria-label="Filter venues"
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col gap-5">
            {/* Top row: Search and Dropdowns */}
            <div className="flex flex-col md:flex-row gap-4 md:items-center">
              {/* Search */}
              <div className="relative flex-grow max-w-md">
                <label htmlFor="venues-search" className="sr-only">
                  Search venues by name or city
                </label>
                <Search
                  className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey"
                  aria-hidden="true"
                />
                <input
                  id="venues-search"
                  type="search"
                  autoComplete="off"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search venues&#8230;"
                  className="w-full bg-black border border-white text-white pl-11 pr-4 py-3 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white focus:border-white/50 placeholder-[#666] min-h-touch"
                />
              </div>

              {/* City + Capacity selects */}
              <div className="flex gap-3 md:ml-auto">
                <div className="relative flex-1 md:flex-initial">
                  <label htmlFor="city-filter" className="sr-only">
                    Filter by city
                  </label>
                  <select
                    id="city-filter"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="appearance-none w-full bg-black border border-white text-white px-4 pr-10 py-3 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white cursor-pointer min-h-touch"
                  >
                    {VENUE_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c === 'All' ? 'All Cities' : c}
                      </option>
                    ))}
                  </select>
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-mono-light-grey"
                    aria-hidden="true"
                  >
                    &#8964;
                  </span>
                </div>
                <div className="relative flex-1 md:flex-initial">
                  <label htmlFor="capacity-filter" className="sr-only">
                    Filter by capacity
                  </label>
                  <select
                    id="capacity-filter"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="appearance-none w-full bg-black border border-white text-white px-4 pr-10 py-3 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white cursor-pointer min-h-touch"
                  >
                    {VENUE_CAPACITY_BUCKETS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-mono-light-grey"
                    aria-hidden="true"
                  >
                    &#8964;
                  </span>
                </div>
              </div>
            </div>

            {/* Type chips */}
            <div
              role="group"
              aria-label="Filter by venue type"
              className="flex gap-2 overflow-x-auto scrollbar-none pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap"
            >
              <FilterChip label="All Types" active={type === 'all'} onClick={() => setType('all')} />
              {VENUE_TYPES.map((t) => (
                <FilterChip
                  key={t}
                  label={VENUE_TYPE_LABELS[t]}
                  active={type === t}
                  onClick={() => setType(t)}
                />
              ))}
            </div>
          </div>

          {/* Result count + clear */}
          <div className="flex items-center justify-between mt-4 text-xs">
            <motion.p
              key={`${filtered.length}-${city}-${type}-${capacity}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="text-mono-light-grey uppercase tracking-widest"
              aria-live="polite"
            >
              {filtered.length} {filtered.length === 1 ? 'venue' : 'venues'} found
            </motion.p>
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.button
                  type="button"
                  onClick={clearFilters}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex items-center gap-1 uppercase tracking-widest text-white hover:underline min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  <X className="w-3 h-3" aria-hidden="true" /> Clear filters
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      {/* Grid */}
      <section className="py-12 md:py-16" aria-label="Venue list">
        <div className="container mx-auto px-4 md:px-6">
          <AnimatePresence mode="wait">
            {filtered.length > 0 ? (
              <motion.div
                key={`${city}-${type}-${capacity}-${search}`}
                variants={gridStaggerContainer}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filtered.map((venue) => (
                  <motion.div key={venue.id} variants={gridItem} className="h-full">
                    <VenueCard venue={venue} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="text-center py-24 border border-mono-dark-grey"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <MapPin className="w-12 h-12 text-mono-dark-grey mx-auto mb-4" aria-hidden="true" />
                </motion.div>
                <p className="font-bold uppercase text-white mb-2">No venues match your filters</p>
                <p className="text-mono-light-grey uppercase tracking-widest text-xs mb-6">
                  {"// TRY_ADJUSTING_OR_CLEARING_THEM"}
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-6 py-4 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  Reset Filters <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display font-bold text-2xl md:text-3xl uppercase text-white tabular-nums">{value}</p>
      <p className="text-[10px] md:text-xs text-mono-light-grey uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className={`shrink-0 whitespace-nowrap px-4 py-2 text-xs uppercase tracking-widest border transition-colors duration-200 min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
        active
          ? 'bg-white text-black border-white'
          : 'bg-black text-white border-mono-dark-grey hover:border-white'
      }`}
    >
      {label}
    </motion.button>
  );
}
