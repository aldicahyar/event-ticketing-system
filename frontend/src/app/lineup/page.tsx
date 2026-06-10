'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, MapPin, Ticket, Clock, Filter } from 'lucide-react';
import { IndustrialBadge } from '@/components/ui/industrial-components';

const LINEUP = [
  {
    id: '1',
    artist: 'BRING ME THE HORIZON',
    genre: 'Metalcore',
    origin: 'UK',
    date: '2026-03-15',
    venue: 'Jakarta GBK Stadium',
    price: 750000,
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=800&auto=format&fit=crop',
    status: 'headliner'
  },
  {
    id: '2',
    artist: 'BAD OMENS',
    genre: 'Alternative Metal',
    origin: 'USA',
    date: '2026-05-20',
    venue: 'Jakarta ICE BSD',
    price: 650000,
    image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=800&auto=format&fit=crop',
    status: 'headliner'
  },
  {
    id: '3',
    artist: 'NORTHLANE',
    genre: 'Progressive Metalcore',
    origin: 'Australia',
    date: '2026-07-10',
    venue: 'Surabaya Grand City',
    price: 450000,
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop',
    status: 'featured'
  },
  {
    id: '4',
    artist: 'THORNILL',
    genre: 'Metalcore',
    origin: 'USA',
    date: '2026-08-15',
    venue: 'Bali Jimbarana Panggung',
    price: 400000,
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop',
    status: 'featured'
  },
  {
    id: '5',
    artist: 'FIT FOR A KING',
    genre: 'Metalcore',
    origin: 'USA',
    date: '2026-09-05',
    venue: 'Jakarta Matraman',
    price: 550000,
    image: 'https://images.unsplash.com/photo-1557787163-1635e2efb160?q=80&w=800&auto=format&fit=crop',
    status: 'featured'
  },
  {
    id: '6',
    artist: 'COUNTERPARTS',
    genre: 'Melodic Hardcore',
    origin: 'Canada',
    date: '2026-10-22',
    venue: 'Bandung Grand Locke',
    price: 450000,
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800&auto=format&fit=crop',
    status: 'featured'
  },
  {
    id: '7',
    artist: 'LANDMVRKS',
    genre: 'Alternative Rock',
    origin: 'France',
    date: '2026-11-15',
    venue: 'Yogyakarta Soc',
    price: 350000,
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=800&auto=format&fit=crop',
    status: 'support'
  },
  {
    id: '8',
    artist: 'CURRENTS',
    genre: 'Progressive Metalcore',
    origin: 'USA',
    date: '2026-12-01',
    venue: 'Malang Polaris',
    price: 400000,
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
    status: 'support'
  }
];

export default function LineupPage() {
  const [filter, setFilter] = useState('All');

  const filteredLineup = LINEUP.filter(
    event => filter === 'All' || event.genre.includes(filter) || event.status === filter
  );

  return (
    <main className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white" />
            <span className="text-xl font-display font-bold uppercase">EventTicket.</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/events" className="text-sm font-semibold uppercase text-white hover:text-[#CCCCCC]">
              Events
            </Link>
            <Link href="/lineup" className="text-sm font-semibold uppercase text-[#CCCCCC]">
              Lineup
            </Link>
            <Link href="/auth/login" className="text-sm font-semibold uppercase text-white">
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 md:py-24 border-b border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6">
          <h1 className="font-display font-bold text-5xl md:text-7xl uppercase text-white mb-4">
            Artist <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Lineup</span>
          </h1>
          <p className="text-xl text-mono-light-grey uppercase tracking-widest mb-8">
            // 2025 Tour Schedule
          </p>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            {['All', 'Metalcore', 'Alternative Metal', 'Progressive Metalcore', 'featured'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border transition-all duration-300 ${
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
      <section className="py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredLineup.map((artist) => (
              <Link 
                key={artist.id} 
                href={`/events/${artist.id}`}
                className="group block bg-black border border-mono-dark-grey hover:border-white transition-all duration-300"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden">
                  <img 
                    src={artist.image} 
                    alt={artist.artist}
                    className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  
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
                    {artist.genre} • {artist.origin}
                  </p>
                  
                  {/* Date & Venue */}
                  <div className="space-y-1 mb-4">
                    <div className="flex items-center gap-2 text-xs text-[#CCCCCC]">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(artist.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#CCCCCC]">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{artist.venue}</span>
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="flex items-center justify-between pt-3 border-t border-mono-dark-grey">
                    <span className="text-sm font-bold text-white">
                      IDR {artist.price.toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs font-bold uppercase text-white group-hover:underline flex items-center gap-1">
                      Get Tickets <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="font-display font-bold text-3xl md:text-4xl uppercase text-white mb-4">
            Don't Miss the Tour
          </h2>
          <p className="text-mono-light-grey uppercase tracking-widest mb-8">
            Limited tickets available for all shows
          </p>
          <Link href="/events">
            <button className="px-8 py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 flex items-center justify-center gap-3 mx-auto">
              View All Events
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </section>
    </main>
  );
}
