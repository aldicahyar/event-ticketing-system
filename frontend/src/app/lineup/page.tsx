'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, MapPin } from 'lucide-react';
import { IndustrialBadge } from '@/components/ui/industrial-components';
import { Navbar } from '@/components/layout/Navbar';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { filterUpcomingEvents } from '@/lib/events';

interface LineupItem {
  id: string;
  artist: string;
  genre: string;
  date: string;
  venue: string;
  price: number;
  image: string;
  status: 'headliner' | 'featured';
}

const mapDbEventToLineup = (e: any, index: number): LineupItem => {
  let minPrice = Number(e.base_price);
  if (e.ticket_tiers && e.ticket_tiers.length > 0) {
    minPrice = Math.min(...e.ticket_tiers.map((t: any) => Number(t.price)));
  }

  return {
    id: e.id,
    artist: (e.title || '').toUpperCase(),
    genre: e.genre?.name || (typeof e.genre === 'string' ? e.genre : ''),
    date: e.event_date || e.start_date_time,
    venue: e.venue?.name || '',
    price: minPrice,
    image: e.image_url || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14',
    // ponytail: DB has no headliner flag; earliest upcoming show is headliner. Add a real field when needed.
    status: index === 0 ? 'headliner' : 'featured'
  };
};

const HERO_HEADING_ID = 'lineup-hero-heading';
const GRID_HEADING_ID = 'lineup-grid-heading';
const CTA_HEADING_ID = 'lineup-cta-heading';

export default function LineupPage() {
  const [lineup, setLineup] = useState<LineupItem[]>([]);
  const [genres, setGenres] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    async function loadLineup() {
      try {
        const [list, activeGenres] = await Promise.all([
          apiClient.get<any[]>('/events'),
          apiClient.listActiveGenres().catch(() => []),
        ]);

        if (activeGenres && activeGenres.length > 0) {
          const names = Array.from(new Set(activeGenres.map((g: any) => g.name)));
          setGenres(['All', ...names]);
        }

        if (list && Array.isArray(list)) {
          const upcoming = filterUpcomingEvents(list).sort((a: any, b: any) => {
            const da = new Date(a.event_date || a.start_date_time).getTime();
            const db = new Date(b.event_date || b.start_date_time).getTime();
            return da - db;
          });
          setLineup(upcoming.map(mapDbEventToLineup));
        }
      } catch (err) {
        console.error('Failed to load lineup:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLineup();
  }, []);

  const filteredLineup = lineup.filter(
    event => filter === 'All' || event.genre.toLowerCase() === filter.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar links={[{ href: '/events', label: 'Events' }, { href: '/venues', label: 'Venues' }, { href: '/lineup', label: 'Lineup', active: true }]} />

      {/* Hero Section */}
      <section aria-labelledby={HERO_HEADING_ID} className="py-16 md:py-24 border-b border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6">
          <h1 id={HERO_HEADING_ID} className="font-display font-bold text-3xl sm:text-4xl md:text-5xl md:text-7xl uppercase text-white mb-4">
            Artist <span className="text-transparent stroke-text" aria-hidden="true" style={{ WebkitTextStroke: "2px white" }}>Lineup</span>
          </h1>
          <p className="text-lg md:text-xl text-mono-light-grey uppercase tracking-widest mb-8">
            // {new Date().getFullYear()} Tour Schedule
          </p>

          {/* Filters */}
          <div role="group" aria-label="Filter lineup" className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
            {genres.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`px-3 py-2.5 md:px-4 md:py-2 text-xs md:text-sm font-bold uppercase tracking-wide border transition-all duration-300 min-h-touch whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
                  filter === f
                    ? 'bg-white text-black border-white'
                    : 'bg-black text-[#CCCCCC] border-mono-dark-grey hover:border-white hover:text-white'
                }`}
              >
                {f === 'featured' ? 'Featured' : f}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Lineup Grid */}
      <section aria-labelledby={GRID_HEADING_ID} className="py-16">
        <div className="container mx-auto px-4 md:px-6">
          <h2 id={GRID_HEADING_ID} className="sr-only">Artist lineup</h2>
          {loading ? (
            <div className="text-center py-24">
              <div className="w-12 h-12 border-4 border-white border-t-transparent animate-spin mx-auto mb-4" />
              <p className="uppercase tracking-widest text-sm">// LOADING_LINEUP...</p>
            </div>
          ) : filteredLineup.length === 0 ? (
            <div role="alert" className="text-center py-16 border border-mono-dark-grey">
              <h3 className="font-display font-bold text-2xl uppercase text-white mb-2">
                No Artists Found
              </h3>
              <p className="text-mono-light-grey uppercase tracking-widest text-sm mb-4">
                Try adjusting your filters
              </p>
              <button
                onClick={() => setFilter('All')}
                className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wide min-h-[44px] focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              >
                View All Lineup
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredLineup.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/events/${artist.id}`}
                  aria-label={artist.artist}
                  className="group block bg-black border border-mono-dark-grey hover:border-white transition-all duration-300 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={artist.image}
                      alt={artist.artist}
                      className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" aria-hidden="true" />

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <IndustrialBadge className={
                        artist.status === 'headliner'
                          ? 'bg-white text-black border-white'
                          : 'bg-black text-white border-white'
                      }>
                        {artist.status === 'headliner' ? 'HEADLINER' : 'FEATURED'}
                      </IndustrialBadge>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-display font-bold text-lg uppercase text-white leading-none mb-2 group-hover:text-white">
                      {artist.artist}
                    </h3>
                    <p className="text-xs text-mono-light-grey uppercase tracking-widest mb-3">
                      {artist.genre || 'Music'}
                    </p>

                    {/* Date & Venue */}
                    <div className="space-y-1 mb-4">
                      <div className="flex items-center gap-2 text-xs text-[#CCCCCC]">
                        <Calendar className="w-3 h-3" aria-hidden="true" />
                        <time dateTime={artist.date}>
                          {new Date(artist.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </time>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#CCCCCC]">
                        <MapPin className="w-3 h-3" aria-hidden="true" />
                        <span className="truncate">{artist.venue}</span>
                      </div>
                    </div>

                    {/* Price & CTA */}
                    <div className="flex items-center justify-between pt-3 border-t border-mono-dark-grey">
                      <span className="text-sm font-bold text-white">
                        {formatCurrency(artist.price)}
                      </span>
                      <span className="text-xs font-bold uppercase text-white group-hover:underline flex items-center gap-1">
                        Get Tickets <ArrowRight className="w-3 h-3" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section aria-labelledby={CTA_HEADING_ID} className="py-16 border-t border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 id={CTA_HEADING_ID} className="font-display font-bold text-2xl md:text-3xl md:text-4xl uppercase text-white mb-4">
            Don&apos;t Miss the Tour
          </h2>
          <p className="text-mono-light-grey uppercase tracking-widest mb-8">
            Limited tickets available for all shows
          </p>
          <Link
            href="/events"
            className="inline-flex items-center justify-center gap-3 min-h-touch px-6 md:px-8 py-3 md:py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
          >
            View All Events
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
