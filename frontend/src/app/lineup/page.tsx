'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { apiClient } from '@/lib/api-client';
import type { Artist } from '@/types/artist';

const HERO_HEADING_ID = 'lineup-hero-heading';
const GRID_HEADING_ID = 'lineup-grid-heading';
const CTA_HEADING_ID = 'lineup-cta-heading';

export default function LineupPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [genres, setGenres] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    async function loadLineup() {
      try {
        const list = await apiClient.listArtistsForLineup();

        if (list && Array.isArray(list)) {
          setArtists(list);

          const genreNames = Array.from(
            new Set(list.map((a) => a.genre?.name).filter(Boolean) as string[]),
          );
          if (genreNames.length > 0) setGenres(['All', ...genreNames]);
        }
      } catch (err) {
        console.error('Failed to load lineup:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLineup();
  }, []);

  // Artists with at least one upcoming show; the backend already filters the
  // events relation, this is just defense in depth.
  const withShows = artists.filter((a) => (a.events?.length ?? 0) > 0);
  const filteredArtists = withShows.filter(
    (a) => filter === 'All' || a.genre?.name === filter,
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
            // {new Date().getFullYear()} Performing Artists
          </p>

          {/* Filters */}
          {genres.length > 1 && (
            <div role="group" aria-label="Filter lineup by genre" className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
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
                  {f}
                </button>
              ))}
            </div>
          )}
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
          ) : filteredArtists.length === 0 ? (
            <div role="alert" className="text-center py-16 border border-mono-dark-grey">
              <h3 className="font-display font-bold text-2xl uppercase text-white mb-2">
                No Artists Found
              </h3>
              <p className="text-mono-light-grey uppercase tracking-widest text-sm mb-4">
                {filter !== 'All' ? 'Try adjusting your filters' : 'The lineup has not been announced yet'}
              </p>
              {filter !== 'All' && (
                <button
                  onClick={() => setFilter('All')}
                  className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wide min-h-[44px] focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  View All Lineup
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredArtists.map((artist, idx) => {
                const showCount = artist.events?.length ?? 0;
                return (
                  <motion.div
                    key={artist.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  >
                    <Link
                      href={`/artists/${encodeURIComponent(artist.code)}`}
                      aria-label={`View ${artist.name} events`}
                      className="group block h-full bg-black border border-mono-dark-grey hover:border-white transition-all duration-300 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                    >
                      {/* Image (or honest typographic block when no photo exists) */}
                      <div className="relative aspect-square overflow-hidden">
                        {artist.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={artist.image_url}
                            alt={artist.name}
                            className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-black flex items-center justify-center border-b border-mono-dark-grey">
                            <span className="font-display font-bold text-7xl md:text-8xl uppercase text-transparent stroke-text" aria-hidden="true" style={{ WebkitTextStroke: '2px #444' }}>
                              {artist.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" aria-hidden="true" />

                        {/* Show count badge */}
                        <div className="absolute top-3 left-3 bg-black text-white border border-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                          {showCount} {showCount === 1 ? 'Show' : 'Shows'}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-display font-bold text-lg uppercase text-white leading-none mb-2">
                          {artist.name}
                        </h3>
                        <p className="text-xs text-mono-light-grey uppercase tracking-widest mb-3">
                          {artist.genre?.name || '—'}
                        </p>

                        {artist.origin && (
                          <div className="flex items-center gap-2 text-xs text-[#CCCCCC]">
                            <MapPin className="w-3 h-3" aria-hidden="true" />
                            <span className="truncate">{artist.origin}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-end pt-3 mt-3 border-t border-mono-dark-grey">
                          <span className="text-xs font-bold uppercase text-white group-hover:underline flex items-center gap-1">
                            View Events <ArrowRight className="w-3 h-3" aria-hidden="true" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
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
