'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calendar, MapPin, Ticket } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { filterUpcomingEvents, getMinPrice, type RawEvent } from '@/lib/events';
import type { Artist } from '@/types/artist';

export default function ArtistDetailPage() {
  const params = useParams();
  const code = typeof params?.code === 'string' ? params.code : Array.isArray(params?.code) ? params.code[0] : '';

  const [artist, setArtist] = useState<Artist | null>(null);
  const [events, setEvents] = useState<RawEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;

    async function load() {
      setLoading(true);
      try {
        const [detail, eventList] = await Promise.all([
          apiClient.getArtistByCode(code),
          apiClient.listArtistEvents(code),
        ]);
        setArtist(detail ?? null);
        // The backend already filters to upcoming published shows; filter again
        // locally so a stale cache can never show past events.
        setEvents(filterUpcomingEvents(eventList ?? []));
      } catch (err) {
        // 404 from the backend means the code is unknown or the artist is inactive.
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) setNotFound(true);
        else console.error('Failed to load artist:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono">
        <Navbar links={[{ href: '/events', label: 'Events' }, { href: '/venues', label: 'Venues' }, { href: '/artists', label: 'Artists' }]} />
        <div className="text-center py-24">
          <div className="w-12 h-12 border-4 border-white border-t-transparent animate-spin mx-auto mb-4" />
          <p className="uppercase tracking-widest text-sm">// LOADING_ARTIST...</p>
        </div>
      </div>
    );
  }

  if (notFound || !artist) {
    return (
      <div className="min-h-screen bg-black text-white font-mono">
        <Navbar links={[{ href: '/events', label: 'Events' }, { href: '/venues', label: 'Venues' }, { href: '/artists', label: 'Artists' }]} />
        <div className="container mx-auto px-4 md:px-6 py-24 text-center">
          <h1 className="font-display font-bold text-3xl md:text-4xl uppercase text-white mb-4">
            Artist Not Found
          </h1>
          <p className="text-mono-light-grey uppercase tracking-widest text-sm mb-8">
            // UNKNOWN_ARTIST_CODE
          </p>
          <Link
            href="/artists"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold uppercase tracking-wide border-2 border-white hover:bg-transparent hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Artists
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar links={[{ href: '/events', label: 'Events' }, { href: '/venues', label: 'Venues' }, { href: '/artists', label: 'Artists', active: true }]} />

      {/* Artist header */}
      <section className="border-b border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
          <Link
            href="/artists"
            className="inline-flex items-center gap-2 text-xs text-mono-light-grey hover:text-white uppercase tracking-widest mb-8 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
          >
            <ArrowLeft className="w-4 h-4" /> All Artists
          </Link>

          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
            <div className="w-40 h-40 md:w-56 md:h-56 shrink-0 border border-mono-dark-grey overflow-hidden">
              {artist.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artist.image_url}
                  alt={artist.name}
                  className="w-full h-full object-cover grayscale contrast-125"
                />
              ) : (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <span
                    className="font-display font-bold text-8xl uppercase text-transparent stroke-text"
                    aria-hidden="true"
                    style={{ WebkitTextStroke: '2px #444' }}
                  >
                    {artist.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <p className="text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                // {artist.code}
              </p>
              <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-6xl uppercase text-white mb-4">
                {artist.name}
              </h1>
              <div className="flex flex-wrap gap-3 mb-6">
                {artist.genre && (
                  <span className="px-3 py-1 bg-white text-black text-[10px] font-bold uppercase tracking-widest">
                    {artist.genre.name}
                  </span>
                )}
                {artist.origin && (
                  <span className="flex items-center gap-1.5 px-3 py-1 border border-mono-dark-grey text-[#CCCCCC] text-[10px] font-bold uppercase tracking-widest">
                    <MapPin className="w-3 h-3" aria-hidden="true" /> {artist.origin}
                  </span>
                )}
                <span className="px-3 py-1 border border-mono-dark-grey text-[#CCCCCC] text-[10px] font-bold uppercase tracking-widest">
                  {events.length} Upcoming {events.length === 1 ? 'Show' : 'Shows'}
                </span>
              </div>
              {artist.bio && (
                <p className="text-sm md:text-base text-[#CCCCCC] leading-relaxed max-w-3xl">
                  {artist.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Events list */}
      <section aria-labelledby="artist-events-heading" className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6">
          <h2 id="artist-events-heading" className="font-display font-bold text-2xl md:text-3xl uppercase text-white mb-8">
            Upcoming <span className="text-transparent stroke-text" aria-hidden="true" style={{ WebkitTextStroke: '2px white' }}>Shows</span>
          </h2>

          {events.length === 0 ? (
            <div className="border border-mono-dark-grey p-10 text-center">
              <Calendar className="w-10 h-10 text-mono-dark-grey mx-auto mb-3" aria-hidden="true" />
              <p className="text-mono-light-grey uppercase text-sm tracking-widest">
                No upcoming shows announced for this artist
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, idx) => {
                // filterUpcomingEvents guarantees a date exists; the fallback
                // only satisfies the type checker.
                const dateStr = event.event_date || event.start_date_time || '';
                const venue = event.venue as { name?: string; city?: string } | undefined;
                const available = (event._count as { seats?: number } | undefined)?.seats ?? 0;

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                    className="bg-black border border-mono-dark-grey hover:border-white transition-colors p-4 md:p-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 md:gap-6 items-center"
                  >
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 text-white">
                        <Calendar className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <time dateTime={dateStr} className="font-bold uppercase text-sm md:text-base">
                          {formatDate(dateStr)}
                        </time>
                      </div>
                      <div className="flex items-center gap-2 text-[#CCCCCC] text-xs md:text-sm">
                        <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="truncate uppercase">
                          {venue?.name ? `${venue.name}${venue.city ? ` — ${venue.city}` : ''}` : 'Venue TBA'}
                        </span>
                      </div>
                      {event.subtitle && (
                        <p className="text-xs text-mono-light-grey uppercase tracking-widest truncate">
                          {event.subtitle}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 border-t md:border-t-0 border-mono-dark-grey pt-4 md:pt-0">
                      <div className="text-left md:text-right">
                        <p className="text-[10px] text-mono-light-grey uppercase tracking-widest">From</p>
                        <p className="font-bold text-white text-sm md:text-base whitespace-nowrap">
                          {formatCurrency(getMinPrice(event), event.currency as string | undefined)}
                        </p>
                        <p className="text-[10px] text-mono-light-grey uppercase tracking-widest flex items-center gap-1 mt-0.5">
                          <Ticket className="w-3 h-3" aria-hidden="true" />
                          {available} left
                        </p>
                      </div>
                      <Link
                        href={`/events/${event.id}`}
                        className="shrink-0 inline-flex items-center gap-2 px-5 py-3 bg-white text-black font-bold uppercase text-xs border-2 border-white hover:bg-transparent hover:text-white transition-all focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                      >
                        Get Tickets <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
