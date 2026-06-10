'use client';

import React, { useState } from 'react';
import { ArrowRight, Calendar, Filter, MapPin, Clock } from 'lucide-react';
import { IndustrialBadge } from '@/components/ui/industrial-components';
import Link from 'next/link';

// Mock Data - Metalcore/Alternative/Post-Hardcore Artists - 2026 Dates
const EVENTS = [
  {
    id: '1',
    artist: 'BRING ME THE HORIZON',
    date: '2026-03-15',
    price: 750000,
    genre: 'Metalcore',
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop',
    ticketsLeft: 2500,
    status: 'available',
    venue: 'Jakarta GBK Stadium'
  },
  {
    id: '2',
    artist: 'BAD OMENS',
    date: '2026-05-20',
    price: 650000,
    genre: 'Alternative Metal',
    image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=1000&auto=format&fit=crop',
    ticketsLeft: 180,
    status: 'selling_fast',
    venue: 'Jakarta ICE BSD'
  },
  {
    id: '3',
    artist: 'NORTHLANE',
    date: '2026-07-10',
    price: 450000,
    genre: 'Progressive Metalcore',
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop',
    ticketsLeft: 50,
    status: 'last_tickets',
    venue: 'Surabaya Grand City'
  },
  {
    id: '4',
    artist: 'THORNILL',
    date: '2026-08-15',
    price: 400000,
    genre: 'Metalcore',
    image: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=1000&auto=format&fit=crop',
    ticketsLeft: 200,
    status: 'available',
    venue: 'Bali Jimbarana Panggung'
  },
  {
    id: '5',
    artist: 'FIT FOR A KING',
    date: '2026-09-05',
    price: 550000,
    genre: 'Metalcore',
    image: 'https://images.unsplash.com/photo-1557787163-1635e2efb160?q=80&w=1000&auto=format&fit=crop',
    ticketsLeft: 15,
    status: 'last_tickets',
    venue: 'Jakarta Matraman'
  },
  {
    id: '6',
    artist: 'COUNTERPARTS',
    date: '2026-10-22',
    price: 450000,
    genre: 'Melodic Hardcore',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1000&auto=format&fit=crop',
    ticketsLeft: 300,
    status: 'available',
    venue: 'Bandung Grand Locke'
  }
];

export const EventList = () => {
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Date');

  const filteredEvents = EVENTS.filter(event => 
    filter === 'All' ? true : event.genre === filter
  ).sort((a, b) => {
    if (sortBy === 'Date') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'Price') return a.price - b.price;
    return 0;
  });

  return (
    <section className="bg-black py-20 border-t border-mono-dark-grey relative z-20">
      <div className="container mx-auto px-6">
        
        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="font-display font-bold text-4xl uppercase text-white mb-2">Upcoming Tours</h2>
            <p className="text-mono-light-grey uppercase tracking-widest text-sm">// SECURE_YOUR_SPOT</p>
          </div>

          <div className="flex gap-4">
            <div className="relative group">
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="appearance-none bg-black border border-white text-white px-4 py-2 pr-8 rounded-none font-mono text-sm uppercase focus:outline-none cursor-pointer hover:bg-white hover:text-black transition-colors"
              >
                <option value="All">All Genres</option>
                <option value="Metalcore">Metalcore</option>
                <option value="Alternative Metal">Alternative Metal</option>
                <option value="Progressive Metalcore">Progressive</option>
                <option value="Melodic Hardcore">Melodic</option>
              </select>
              <Filter className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none mix-blend-difference" />
            </div>

            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-black border border-white text-white px-4 py-2 rounded-none font-mono text-sm uppercase focus:outline-none cursor-pointer hover:bg-white hover:text-black transition-colors"
            >
              <option value="Date">Sort by Date</option>
              <option value="Price">Sort by Price</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredEvents.map((event) => (
            <div key={event.id} className="group border border-mono-dark-grey hover:border-white transition-colors duration-300 bg-black flex flex-col h-full">
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
                   <div className="absolute bottom-0 left-0 w-full bg-white text-black text-xs font-bold uppercase py-1 px-2 text-center animate-pulse">
                     Only {event.ticketsLeft} tickets left
                   </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-grow justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-mono-light-grey text-xs mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}</span>
                    <span className="text-mono-dark-grey">|</span>
                    <MapPin className="w-3 h-3" />
                    <span>{event.venue}</span>
                  </div>
                  <h3 className="font-display font-bold text-xl uppercase text-white leading-none mb-2">{event.artist}</h3>
                  
                  {/* Status Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <IndustrialBadge className={
                      event.status === 'last_tickets' 
                        ? 'bg-red-600 text-white border-red-600' 
                        : event.status === 'selling_fast'
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-white text-black border-white'
                    }>
                      {event.status === 'last_tickets' ? 'SELLING FAST' : 
                       event.status === 'selling_fast' ? 'LIMITED TICKETS' : 
                       'AVAILABLE'}
                    </IndustrialBadge>
                    <span className="text-xs text-mono-light-grey">
                      {event.ticketsLeft < 50 
                        ? `${event.ticketsLeft} left` 
                        : `${event.ticketsLeft.toLocaleString()} tickets`}
                    </span>
                  </div>
                  
                  <p className="text-sm text-white font-bold">IDR {event.price.toLocaleString('id-ID')}</p>
                </div>

                <Link href={`/events/${event.id}`} className="block">
                  <button className="w-full h-10 bg-white text-black border border-white font-bold uppercase tracking-wider text-sm hover:bg-black hover:text-white transition-colors duration-300 flex items-center justify-center gap-2">
                    Get Tickets <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
