'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Calendar, Filter, MapPin } from 'lucide-react';
import { IndustrialBadge } from '@/components/ui/industrial-components';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface EventItem {
  id: string;
  artist: string;
  date: string;
  price: number;
  genre: string;
  image: string;
  ticketsLeft: number;
  status: string;
  venue: string;
}

const mapDbEventToFrontend = (e: any): EventItem => {
  return {
    id: e.id,
    artist: e.title,
    date: e.event_date || e.start_date_time,
    price: Number(e.base_price),
    genre: 'Metalcore',
    image: e.image_url || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop',
    ticketsLeft: e.seats ? e.seats.filter((s: any) => s.status === 'AVAILABLE').length : 100,
    status: e.status === 'PUBLISHED' ? 'available' : 'selling_fast',
    venue: e.venue?.name || 'Venue'
  };
};

const getStatusLabel = (status: string) => {
  if (status === 'last_tickets') return 'SELLING FAST';
  if (status === 'selling_fast') return 'LIMITED TICKETS';
  return 'AVAILABLE';
};

const getStatusBadgeClass = (status: string) => {
  if (status === 'last_tickets') return 'bg-red-600 text-white border-red-600';
  if (status === 'selling_fast') return 'bg-orange-600 text-white border-orange-600';
  return 'bg-white text-black border-white';
};

export const EventList = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Date');

  useEffect(() => {
    async function loadEvents() {
      try {
        const list = await apiClient.get<any[]>('/events');
        if (list && Array.isArray(list)) {
          setEvents(list.map(mapDbEventToFrontend));
        }
      } catch (err) {
        console.error('Failed to load events in EventList:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const filteredEvents = events.filter(event =>
    filter === 'All' ? true : event.genre === filter
  ).sort((a, b) => {
    if (sortBy === 'Date') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'Price') return a.price - b.price;
    return 0;
  });

  return (
    <section
      className="bg-black py-12 md:py-20 border-t border-mono-dark-grey relative z-20"
      aria-labelledby="upcoming-tours-heading"
    >
      <div className="container mx-auto px-4 md:px-6">

        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4 md:gap-6">
          <div>
            <h2 id="upcoming-tours-heading" className="font-display font-bold text-2xl sm:text-3xl md:text-4xl uppercase text-white mb-2">Upcoming Tours</h2>
            <p className="text-mono-light-grey uppercase tracking-widest text-xs sm:text-sm">{"// SECURE_YOUR_SPOT"}</p>
          </div>

          <div className="flex gap-3 md:gap-4 w-full md:w-auto">
            <div className="relative group flex-1 md:flex-initial">
              <label htmlFor="genre-filter" className="sr-only">Filter by genre</label>
              <select
                id="genre-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="appearance-none w-full md:w-auto bg-black border border-white text-white px-4 py-3 md:py-2 pr-8 rounded-none font-mono text-sm uppercase focus:outline-none focus-visible:outline-2 focus-visible:outline-white cursor-pointer hover:bg-white hover:text-black transition-colors min-h-touch"
              >
                <option value="All">All Genres</option>
                <option value="Metalcore">Metalcore</option>
                <option value="Alternative Metal">Alternative Metal</option>
                <option value="Progressive Metalcore">Progressive</option>
                <option value="Melodic Hardcore">Melodic</option>
              </select>
              <Filter className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none mix-blend-difference" aria-hidden="true" />
            </div>

            <div className="flex-1 md:flex-initial">
              <label htmlFor="sort-select" className="sr-only">Sort events</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none w-full md:w-auto bg-black border border-white text-white px-4 py-3 md:py-2 rounded-none font-mono text-sm uppercase focus:outline-none focus-visible:outline-2 focus-visible:outline-white cursor-pointer hover:bg-white hover:text-black transition-colors min-h-touch"
              >
                <option value="Date">Sort by Date</option>
                <option value="Price">Sort by Price</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="w-8 h-8 border-4 border-white border-t-transparent animate-spin mx-auto mb-2" />
              <p className="uppercase tracking-widest text-xs">{"// LOADING_EVENTS..."}</p>
            </div>
          ) : filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <article key={event.id} className="group border border-mono-dark-grey hover:border-white transition-colors duration-300 bg-black flex flex-col h-full">
                {/* Image Container */}
                <div className="relative aspect-[16/9] overflow-hidden scanline">
                  <img
                    src={event.image}
                    alt={event.artist}
                    className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-2 right-2">
                    <IndustrialBadge className="bg-black text-white border-white">
                      {event.genre}
                    </IndustrialBadge>
                  </div>
                  {event.ticketsLeft < 20 && (
                    <div className="absolute bottom-0 left-0 w-full bg-white text-black text-xs font-bold uppercase py-1 px-2 text-center animate-pulse" role="alert">
                      Only {event.ticketsLeft} tickets left
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-grow justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-mono-light-grey text-xs mb-2">
                      <Calendar className="w-3 h-3" aria-hidden="true" />
                      <time dateTime={event.date}>
                        {new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                      </time>
                      <span className="text-mono-dark-grey" aria-hidden="true">|</span>
                      <MapPin className="w-3 h-3" aria-hidden="true" />
                      <span>{event.venue}</span>
                    </div>
                    <h3 className="font-display font-bold text-lg sm:text-xl uppercase text-white leading-none mb-2">{event.artist}</h3>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <IndustrialBadge className={getStatusBadgeClass(event.status)}>
                        {getStatusLabel(event.status)}
                      </IndustrialBadge>
                      <span className="text-xs text-mono-light-grey">
                        {event.ticketsLeft < 50
                          ? `${event.ticketsLeft} left`
                          : `${event.ticketsLeft.toLocaleString()} tickets`}
                      </span>
                    </div>

                    <p className="text-sm text-white font-bold">IDR {event.price.toLocaleString('id-ID')}</p>
                  </div>

                  <Link
                    href={`/events/${event.id}`}
                    className="block w-full min-h-touch bg-white text-black border border-white font-bold uppercase tracking-wider text-sm hover:bg-black hover:text-white transition-colors duration-300 flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 text-center"
                    aria-label={`Get tickets for ${event.artist}`}
                  >
                    Get Tickets <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="col-span-full text-center py-12 border border-mono-dark-grey">
              <p className="font-bold uppercase text-white mb-1">No upcoming tours found</p>
              <p className="text-xs text-mono-light-grey uppercase">{"// CHECK_BACK_LATER"}</p>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};
