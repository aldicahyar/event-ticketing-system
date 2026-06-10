'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Calendar, MapPin, Ticket, Filter, 
  Clock, ArrowRight, Users, TrendingUp
} from 'lucide-react';
import { IndustrialBadge } from '@/components/ui/industrial-components';

// Events Data
const EVENTS = [
  {
    id: '1',
    artist: 'BRING ME THE HORIZON',
    tour: 'POST HUMAN: SURVIVAL HORROR',
    date: '2026-03-15',
    venue: 'Jakarta GBK Stadium',
    price: 750000,
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=800&auto=format&fit=crop',
    genre: 'Metalcore',
    ticketsLeft: 2500,
    status: 'available'
  },
  {
    id: '2',
    artist: 'BAD OMENS',
    tour: 'THE DEATH OF PEACE OF MIND',
    date: '2026-05-20',
    venue: 'Jakarta ICE BSD',
    price: 650000,
    image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=800&auto=format&fit=crop',
    genre: 'Alternative Metal',
    ticketsLeft: 180,
    status: 'selling_fast'
  },
  {
    id: '3',
    artist: 'NORTHLANE',
    tour: 'CHARACTER CHANGE TOUR',
    date: '2026-07-10',
    venue: 'Surabaya Grand City',
    price: 450000,
    image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=800&auto=format&fit=crop',
    genre: 'Progressive Metalcore',
    ticketsLeft: 50,
    status: 'last_tickets'
  },
  {
    id: '4',
    artist: 'THORNILL',
    tour: 'MOMENTS OF CLARITY',
    date: '2026-08-15',
    venue: 'Bali Jimbarana Panggung',
    price: 400000,
    image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=800&auto=format&fit=crop',
    genre: 'Metalcore',
    ticketsLeft: 200,
    status: 'available'
  },
  {
    id: '5',
    artist: 'FIT FOR A KING',
    tour: 'DEATHGRIP WORLD TOUR',
    date: '2026-09-05',
    venue: 'Jakarta Matraman',
    price: 550000,
    image: 'https://images.unsplash.com/photo-1557787163-1635e2efb160?q=80&w=800&auto=format&fit=crop',
    genre: 'Metalcore',
    ticketsLeft: 15,
    status: 'last_tickets'
  },
  {
    id: '6',
    artist: 'COUNTERPARTS',
    tour: 'THE HEALING OF HARLOTS',
    date: '2026-10-22',
    venue: 'Bandung Grand Locke',
    price: 450000,
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800&auto=format&fit=crop',
    genre: 'Melodic Hardcore',
    ticketsLeft: 300,
    status: 'available'
  },
  {
    id: '7',
    artist: 'LANDMVRKS',
    tour: 'DARKNESS IN THE LIGHT',
    date: '2026-11-15',
    venue: 'Yogyakarta Soc',
    price: 350000,
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=800&auto=format&fit=crop',
    genre: 'Alternative Rock',
    ticketsLeft: 400,
    status: 'available'
  },
  {
    id: '8',
    artist: 'CURRENTS',
    tour: 'THE DEPRESSION SESSIONS',
    date: '2026-12-01',
    venue: 'Malang Polaris',
    price: 400000,
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
    genre: 'Progressive Metalcore',
    ticketsLeft: 250,
    status: 'available'
  }
];

const GENRES = ['All', 'Metalcore', 'Alternative Metal', 'Progressive Metalcore', 'Melodic Hardcore', 'Alternative Rock'];

export default function EventsPage() {
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');

  const filteredEvents = EVENTS.filter(event => 
    filter === 'All' ? true : event.genre === filter
  ).sort((a, b) => {
    if (sortBy === 'date') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'price') return a.price - b.price;
    if (sortBy === 'popularity') return b.ticketsLeft - a.ticketsLeft;
    return 0;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'last_tickets':
        return <IndustrialBadge className="bg-red-600 text-white border-red-600">SELLING FAST</IndustrialBadge>;
      case 'selling_fast':
        return <IndustrialBadge className="bg-orange-600 text-white border-orange-600">LIMITED</IndustrialBadge>;
      default:
        return <IndustrialBadge className="bg-white text-black border-white">AVAILABLE</IndustrialBadge>;
    }
  };

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
            <Link href="/lineup" className="text-sm font-semibold uppercase text-[#CCCCCC] hover:text-white">
              Lineup
            </Link>
            <Link href="/auth/login" className="text-sm font-semibold uppercase text-white">
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 border-b border-mono-dark-grey overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h1 className="font-display font-bold text-4xl md:text-6xl uppercase text-white mb-4">
              Upcoming <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Events</span>
            </h1>
            <p className="text-mono-light-grey uppercase tracking-widest text-sm">
              // SECURE_YOUR_SPOT_NOW
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap justify-center gap-8 mt-8"
          >
            {[
              { icon: Ticket, label: 'Total Events', value: EVENTS.length },
              { icon: Users, label: 'Tickets Sold', value: '50K+' },
              { icon: TrendingUp, label: 'Upcoming', value: EVENTS.filter(e => new Date(e.date) > new Date()).length },
              { icon: Calendar, label: 'Cities', value: '5+' }
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2">
                <stat.icon className="w-5 h-5 text-white" />
                <div className="text-left">
                  <div className="text-xl font-display font-bold text-white">{stat.value}</div>
                  <div className="text-[10px] text-mono-light-grey uppercase tracking-widest">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Filters & Content */}
      <section className="py-8">
        <div className="container mx-auto px-4 md:px-6">
          
          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
          >
            {/* Genre Filter */}
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setFilter(genre)}
                  className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border transition-all ${
                    filter === genre
                      ? 'bg-white text-black border-white'
                      : 'bg-black text-[#CCCCCC] border-mono-dark-grey hover:border-white'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-mono-light-grey uppercase tracking-widest">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-black border border-white text-white px-4 py-2 text-sm font-bold uppercase focus:outline-none cursor-pointer"
              >
                <option value="date">Date</option>
                <option value="price">Price</option>
                <option value="popularity">Popularity</option>
              </select>
            </div>
          </motion.div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * (index + 1) }}
                className="group bg-black border border-mono-dark-grey hover:border-white transition-all duration-300 flex flex-col h-full"
              >
                {/* Image */}
                <div className="relative aspect-[16/9] overflow-hidden scanline">
                  <img 
                    src={event.image} 
                    alt={event.artist}
                    className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    {getStatusBadge(event.status)}
                  </div>
                  {event.ticketsLeft < 100 && (
                    <div className="absolute bottom-0 left-0 w-full bg-red-600 text-black text-xs font-bold uppercase py-1 px-2 text-center animate-pulse">
                      Only {event.ticketsLeft} tickets left
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-grow justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-mono-light-grey text-xs mb-2">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}</span>
                    </div>
                    <h3 className="font-display font-bold text-lg uppercase text-white leading-none mb-2 group-hover:text-white">
                      {event.artist}
                    </h3>
                    <p className="text-[10px] text-mono-light-grey uppercase tracking-wider mb-2 line-clamp-1">
                      {event.tour}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[#CCCCCC]">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="flex items-center justify-between pt-3 border-t border-mono-dark-grey">
                    <div>
                      <span className="text-xs text-mono-light-grey uppercase">From</span>
                      <div className="text-lg font-bold text-white">
                        IDR {event.price.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <Link href={`/events/${event.id}`}>
                      <button className="px-4 py-2 bg-white text-black border border-white font-bold uppercase text-xs tracking-wide hover:bg-black hover:text-white transition-colors flex items-center gap-1">
                        Get Tickets <ArrowRight className="w-3 h-3" />
                      </button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          {filteredEvents.length === 0 && (
            <div className="text-center py-16 border border-mono-dark-grey">
              <Ticket className="w-16 h-16 text-mono-dark-grey mx-auto mb-4" />
              <h3 className="font-display font-bold text-2xl uppercase text-white mb-2">
                No Events Found
              </h3>
              <p className="text-mono-light-grey uppercase tracking-widest text-sm mb-4">
                Try adjusting your filters
              </p>
              <button
                onClick={() => setFilter('All')}
                className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wide"
              >
                View All Events
              </button>
            </div>
          )}

        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="font-display font-bold text-3xl md:text-4xl uppercase text-white mb-4">
            Don't Miss the <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Tour</span>
          </h2>
          <p className="text-mono-light-grey uppercase tracking-widest text-sm mb-8 max-w-md mx-auto">
            Subscribe to get pre-sale access and exclusive updates
          </p>
          <Link 
            href="/lineup"
            className="inline-block px-8 py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300"
          >
            View Full Lineup
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-mono-dark-grey py-8">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-mono-light-grey">
            <p>© 2024 EventTicket. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
