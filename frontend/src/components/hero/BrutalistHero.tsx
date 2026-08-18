'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Clock, Shield, Ticket, Zap, Calendar, MapPin, ChevronLeft, ChevronRight, User } from 'lucide-react';
import Link from 'next/link';
import { TechnicalMetadata, Crosshair } from './TechnicalMetadata';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';

interface HeroEvent {
  id: string;
  artist: string;
  tour: string;
  date: string;
  venue: string;
  price: number;
  image: string;
  ticketsLeft: number;
  totalTickets: number;
  genre: string;
}

const mapDbEventToHeroEvent = (e: any): HeroEvent => {
  let minPrice = Number(e.base_price);
  if (e.ticket_tiers && e.ticket_tiers.length > 0) {
    minPrice = Math.min(...e.ticket_tiers.map((t: any) => Number(t.price)));
  }

  return {
    id: e.id,
    artist: e.title,
    tour: e.subtitle || 'WORLD TOUR',
    date: e.start_date_time,
    venue: e.venue?.name || 'VENUE',
    price: minPrice,
    image: e.image_url || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=2000&auto=format&fit=crop',
    ticketsLeft: e.available_seats ?? (e.seats ? e.seats.filter((s: any) => s.status === 'AVAILABLE').length : 0),
    totalTickets: e.venue?.capacity || 10000,
    genre: 'Metalcore'
  };
};

const FEATURED_EVENTS = [
  {
    id: '1',
    artist: 'BRING ME THE HORIZON',
    tour: 'POST HUMAN: SURVIVAL HORROR',
    date: '2026-03-15',
    venue: 'JAKARTA GBK STADIUM',
    price: 750000,
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=2000&auto=format&fit=crop',
    ticketsLeft: 2500,
    totalTickets: 10000,
    genre: 'Metalcore'
  },
  {
    id: '2',
    artist: 'BAD OMENS',
    tour: 'THE DEATH OF PEACE OF MIND',
    date: '2026-05-20',
    venue: 'JAKARTA ICE BSD',
    price: 650000,
    image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2000&auto=format&fit=crop',
    ticketsLeft: 1800,
    totalTickets: 8000,
    genre: 'Alternative Metal'
  },
  {
    id: '3',
    artist: 'NORTHLANE',
    tour: 'CHARACTER CHANGE TOUR',
    date: '2026-07-10',
    venue: 'SURABAYA GRAND CITY',
    price: 450000,
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop',
    ticketsLeft: 2200,
    totalTickets: 6000,
    genre: 'Progressive Metalcore'
  },
  {
    id: '4',
    artist: 'FIT FOR A KING',
    tour: 'DEATHGRIP WORLD TOUR',
    date: '2026-09-05',
    venue: 'JAKARTA MATRAMAN',
    price: 550000,
    image: 'https://images.unsplash.com/photo-1557787163-1635e2efb160?q=80&w=2000&auto=format&fit=crop',
    ticketsLeft: 3500,
    totalTickets: 7000,
    genre: 'Metalcore'
  }
];

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance < 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex gap-2 md:gap-3" role="timer" aria-label="Countdown to event">
      {[
        { value: timeLeft.days, label: 'DAYS' },
        { value: timeLeft.hours, label: 'HRS' },
        { value: timeLeft.minutes, label: 'MIN' },
        { value: timeLeft.seconds, label: 'SEC' }
      ].map((item) => (
        <div key={item.label} className="text-center">
          <div className="bg-white text-black font-display font-bold text-lg sm:text-xl md:text-2xl min-w-[36px] sm:min-w-[40px] md:min-w-[50px] py-1 md:py-2">
            {String(item.value).padStart(2, '0')}
          </div>
          <div className="text-[7px] md:text-[10px] text-mono-light-grey uppercase tracking-widest mt-1">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export const BrutalistHero = () => {
  const [events, setEvents] = useState<HeroEvent[]>(FEATURED_EVENTS);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const selectedEvent = events[selectedIndex] || FEATURED_EVENTS[0];

  useEffect(() => {
    async function loadEvents() {
      try {
        const list = await apiClient.get<any[]>('/events');
        if (list && Array.isArray(list) && list.length > 0) {
          const activeEvents = list.filter(e => e.status === 'PUBLISHED' || e.status === 'ONGOING');
          if (activeEvents.length > 0) {
            // Limit to a maximum of 6 featured events to keep the hero section layout clean and premium
            setEvents(activeEvents.slice(0, 6).map(mapDbEventToHeroEvent));
          }
        }
      } catch (err) {
        console.error('Failed to load events in BrutalistHero:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  useEffect(() => {
    setCurrentTime(new Date().toISOString().slice(0, 19).replace('T', ' '));
    const interval = setInterval(() => {
      setCurrentTime(new Date().toISOString().slice(0, 19).replace('T', ' '));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const nextEvent = () => {
    setSelectedIndex((prev) => (prev + 1) % events.length);
  };

  const prevEvent = () => {
    setSelectedIndex((prev) => (prev - 1 + events.length) % events.length);
  };

  const selectEvent = (index: number) => {
    setSelectedIndex(index);
  };

  const soldPercent = ((selectedEvent.totalTickets - selectedEvent.ticketsLeft) / selectedEvent.totalTickets) * 100;

  return (
    <section
      className="relative min-h-screen bg-black text-white overflow-hidden flex flex-col justify-center font-mono selection:bg-white selection:text-black"
      aria-label="Featured events carousel"
    >
      {/* Noise Overlay */}
      <div
        className="absolute inset-0 z-50 pointer-events-none opacity-[0.08]"
        aria-hidden="true"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
          backgroundBlendMode: 'overlay'
        }}
      />

      {/* Grid Overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-30"
        aria-hidden="true"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, #333 0px, #333 1px, transparent 1px, transparent 100px), repeating-linear-gradient(0deg, #333 0px, #333 1px, transparent 1px, transparent 100px)`
        }}
      />

      {/* Crosshairs */}
      <Crosshair className="top-5 left-5 hidden md:block" />
      <Crosshair className="top-5 right-5 hidden md:block" />

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-6 relative z-10 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-[85vh]">

          {/* LEFT SIDE - Featured Event Info */}
          <div className="xl:col-span-8 flex flex-col justify-between relative overflow-hidden">
            {/* Featured Event Background Image */}
            <div className="absolute inset-0 z-0">
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedEvent.id}
                  src={selectedEvent.image}
                  alt=""
                  className="w-full h-full object-cover opacity-40 grayscale contrast-125"
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 0.4, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  aria-hidden="true"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
            </div>

            {/* Technical Metadata */}
            <div className="absolute top-4 right-4 z-20 hidden lg:block">
              <TechnicalMetadata />
            </div>

            {/* Main Content */}
            <div className="relative z-10 p-4 md:p-8 xl:p-12 flex flex-col justify-center h-full">
              {/* Artist Selector */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start sm:items-center gap-2 mb-4 overflow-x-auto md:overflow-x-visible pb-2 scrollbar-none lg:mr-[160px]"
                role="tablist"
                aria-label="Select featured artist"
              >
                <User className="w-4 h-4 text-mono-light-grey shrink-0" aria-hidden="true" />
                <span className="text-xs text-mono-light-grey uppercase tracking-widest mr-2 shrink-0 hidden sm:inline">Select Artist:</span>
                <div className="flex flex-nowrap md:flex-wrap gap-2">
                  {events.map((event, index) => (
                    <button
                      key={event.id}
                      onClick={() => selectEvent(index)}
                      role="tab"
                      aria-selected={index === selectedIndex}
                      aria-label={event.artist}
                      className={`px-3 py-2 min-h-[36px] text-[10px] sm:text-xs font-bold uppercase tracking-wide border transition-all duration-300 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
                        index === selectedIndex
                          ? 'bg-white text-black border-white'
                          : 'bg-black text-[#CCCCCC] border-mono-dark-grey hover:border-white hover:text-white'
                      }`}
                    >
                      {event.artist.length > 12 ? event.artist.substring(0, 12) + '...' : event.artist}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Status Badge */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 bg-white text-black px-3 py-1 text-xs font-bold uppercase tracking-widest mb-4 w-fit"
              >
                <Zap className="w-3 h-3" aria-hidden="true" />
                Featured Event
              </motion.div>

              {/* Artist Name */}
              <AnimatePresence mode="wait">
                <motion.h1
                  key={selectedEvent.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.3 }}
                  className="font-display font-bold leading-none mb-2"
                >
                  <span className="block text-white uppercase tracking-[0.02em] text-3xl sm:text-5xl md:text-7xl lg:text-8xl">
                    {selectedEvent.artist.split(' ').map((word: string, i: number) => (
                      <span key={i} className={i === 0 ? "text-white" : "text-transparent stroke-text"} style={{ WebkitTextStroke: "2px white" }}>
                        {word}{' '}
                      </span>
                    ))}
                  </span>
                </motion.h1>
              </AnimatePresence>

              {/* Tour Name */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={selectedEvent.tour}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-sm sm:text-lg md:text-2xl text-mono-light-grey uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-6 md:mb-8"
                >
                  {selectedEvent.tour}
                </motion.p>
              </AnimatePresence>

              {/* Event Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-3 md:gap-6 mb-6 md:mb-8"
              >
                <div className="flex items-center gap-2 text-white">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
                  <span className="uppercase text-xs sm:text-sm font-semibold">
                    {new Date(selectedEvent.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
                  <span className="uppercase text-xs sm:text-sm font-semibold">{selectedEvent.venue}</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <Ticket className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
                  <span className="uppercase text-xs sm:text-sm font-semibold">From {formatCurrency(selectedEvent.price)}</span>
                </div>
              </motion.div>

              {/* Ticket Availability Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6 md:mb-8"
              >
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-xs text-mono-light-grey uppercase tracking-widest">Tickets Available</span>
                  <span className="text-xs text-red-500 font-bold uppercase animate-pulse" aria-live="polite">
                    {selectedEvent.ticketsLeft.toLocaleString()} remaining
                  </span>
                </div>
                <div className="w-full max-w-md h-2 bg-mono-dark-grey" role="progressbar" aria-valuenow={Math.round(soldPercent)} aria-valuemin={0} aria-valuemax={100} aria-label={`${Math.round(soldPercent)}% sold`}>
                  <motion.div
                    className="h-full bg-white"
                    initial={{ width: '0%' }}
                    animate={{ width: `${soldPercent}%` }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  />
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-3 md:gap-4"
              >
                <Link href={`/events/${selectedEvent.id}`}>
                  <button className="min-w-[140px] sm:min-w-[180px] px-6 sm:px-8 py-3 sm:py-4 bg-white text-black border-2 border-white font-bold tracking-wide uppercase hover:bg-transparent hover:text-white hover:border-white transition-all duration-300 flex items-center justify-center gap-3 group/btn text-sm md:text-base focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
                    Get Tickets
                    <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" aria-hidden="true" />
                  </button>
                </Link>
                <Link href="/lineup">
                  <button className="min-w-[140px] sm:min-w-[180px] px-6 sm:px-8 py-3 sm:py-4 bg-transparent border-2 border-mono-dark-grey text-[#CCCCCC] font-bold tracking-wide uppercase hover:border-white hover:text-white transition-all duration-300 text-sm md:text-base focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
                    View Full Lineup
                  </button>
                </Link>
              </motion.div>

              {/* Navigation Arrows */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={prevEvent}
                  className="p-3 border border-mono-dark-grey text-[#CCCCCC] hover:border-white hover:text-white transition-all duration-300 min-h-touch min-w-touch flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  aria-label="Previous event"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextEvent}
                  className="p-3 border border-mono-dark-grey text-[#CCCCCC] hover:border-white hover:text-white transition-all duration-300 min-h-touch min-w-touch flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  aria-label="Next event"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Countdown & Trust Badges */}
          <div className="xl:col-span-4 flex flex-col gap-4">

            {/* Countdown Section */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-black border border-white p-4 md:p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-white" aria-hidden="true" />
                <span className="text-xs text-mono-light-grey uppercase tracking-widest">Countdown to Show</span>
              </div>
              <CountdownTimer targetDate={selectedEvent.date} />
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-black border border-mono-dark-grey p-4 md:p-6 flex-grow"
            >
              <div className="text-xs text-mono-light-grey uppercase tracking-widest mb-4">
                // TRUST_PROTOCOL
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 md:w-8 md:h-8 text-white" aria-hidden="true" />
                  <div>
                    <div className="text-white font-bold uppercase text-sm">Official Tickets</div>
                    <div className="text-[#666] text-xs">100% Verified Source</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6 md:w-8 md:h-8 text-white" aria-hidden="true" />
                  <div>
                    <div className="text-white font-bold uppercase text-sm">Instant Delivery</div>
                    <div className="text-[#666] text-xs">Digital + Physical Options</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Ticket className="w-6 h-6 md:w-8 md:h-8 text-white" aria-hidden="true" />
                  <div>
                    <div className="text-white font-bold uppercase text-sm">Best Price Guarantee</div>
                    <div className="text-[#666] text-xs">No Hidden Fees</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-black border border-mono-dark-grey p-4 md:p-6"
            >
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="border-r border-mono-dark-grey">
                  <div className="text-2xl md:text-3xl font-display font-bold text-white">50K+</div>
                  <div className="text-[9px] md:text-[10px] text-mono-light-grey uppercase tracking-widest">Tickets Sold</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-display font-bold text-white">99.9%</div>
                  <div className="text-[9px] md:text-[10px] text-mono-light-grey uppercase tracking-widest">Satisfaction</div>
                </div>
              </div>
            </motion.div>

          </div>

        </div>

        {/* Bottom Banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4 border border-mono-dark-grey bg-black p-3 flex items-center justify-between"
        >
          <div className="flex gap-4 sm:gap-6 text-[10px] sm:text-xs text-mono-light-grey uppercase tracking-wider overflow-x-auto whitespace-nowrap scrollbar-none">
            <span aria-hidden="true">// SYSTEM_LOG_START</span>
            <span className="text-green-500" aria-hidden="true">● LIVE EVENTS: {events.length} ACTIVE</span>
            <span className="text-white">SELECTED: {selectedEvent.artist}</span>
            <span className="hidden sm:inline" aria-hidden="true">// {currentTime || 'INITIALIZING...'} UTC</span>
          </div>
          <div className="text-[10px] sm:text-xs text-mono-light-grey uppercase hidden sm:block" aria-hidden="true">
            V.3.0.1 [STABLE]
          </div>
        </motion.div>

      </div>
    </section>
  );
};
