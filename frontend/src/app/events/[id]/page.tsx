'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Calendar, MapPin, Ticket, Users, 
  ChevronLeft, ChevronRight, Shield, Clock,
  CreditCard, Smartphone, CheckCircle, AlertCircle
} from 'lucide-react';

// Types for the event and tickets
interface TicketTier {
  id: string;
  name: string;
  price: number;
  description: string;
  available: number;
  features: string[];
}

interface Seat {
  id: string;
  row: string;
  number: number;
  section: string;
  status: 'available' | 'selected' | 'sold' | 'reserved';
  tier: string;
}

interface Event {
  id: string;
  artist: string;
  tour: string;
  date: string;
  venue: string;
  price: number;
  image: string;
  genre: string;
  description: string;
  ticketsLeft: number;
  tiers: TicketTier[];
}

// Mock API Service - Easy to swap to real API later
const EventService = {
  async getEvent(id: string): Promise<Event | null> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const eventsData: Record<string, Event> = {
      '1': {
        id: '1',
        artist: 'BRING ME THE HORIZON',
        tour: 'POST HUMAN: SURVIVAL HORROR',
        date: '2026-03-15',
        venue: 'Jakarta GBK Stadium',
        price: 750000,
        image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=2000&auto=format&fit=crop',
        genre: 'Metalcore',
        description: 'Bring Me The Horizon returns with their most explosive tour yet. Experience the Post Human: Survival Horror tour live in Jakarta!',
        ticketsLeft: 2500,
        tiers: [
          {
            id: 'vip',
            name: 'VIP',
            price: 1500000,
            description: 'Premium experience with exclusive perks',
            available: 50,
            features: ['Front row access', 'Meet & Greet', 'Exclusive merchandise', 'Soundcheck access', 'VIP lounge']
          },
          {
            id: 'premium',
            name: 'PREMIUM',
            price: 1000000,
            description: 'Best views with premium seating',
            available: 200,
            features: ['Section A seating', 'Early entry', 'Premium gift pack', 'Dedicated entrance']
          },
          {
            id: 'standard',
            name: 'STANDARD',
            price: 750000,
            description: 'General admission with great views',
            available: 1500,
            features: ['Section B/C seating', 'Standard entry', 'Event program']
          },
          {
            id: 'economy',
            name: 'ECONOMY',
            price: 450000,
            description: 'Budget-friendly option',
            available: 800,
            features: ['Section D/E seating', 'Standard entry']
          }
        ]
      },
      '2': {
        id: '2',
        artist: 'BAD OMENS',
        tour: 'THE DEATH OF PEACE OF MIND',
        date: '2026-05-20',
        venue: 'Jakarta ICE BSD',
        price: 650000,
        image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2000&auto=format&fit=crop',
        genre: 'Alternative Metal',
        description: 'Bad Omens brings their critically acclaimed Death Of Peace Of Mind tour to Jakarta.',
        ticketsLeft: 1800,
        tiers: [
          {
            id: 'vip',
            name: 'VIP',
            price: 1200000,
            description: 'Premium experience',
            available: 100,
            features: ['Front row access', 'Meet & Greet', 'Exclusive merchandise']
          },
          {
            id: 'premium',
            name: 'PREMIUM',
            price: 850000,
            description: 'Best views',
            available: 300,
            features: ['Section A seating', 'Early entry']
          },
          {
            id: 'standard',
            name: 'STANDARD',
            price: 650000,
            description: 'General admission',
            available: 1000,
            features: ['Section B seating', 'Standard entry']
          }
        ]
      }
    };

    return eventsData[id] || null;
  },

  async getSeats(eventId: string, tierId: string): Promise<Seat[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    // Generate mock seats
    const seats: Seat[] = [];
    const sections = ['A', 'B', 'C', 'D'];
    const rows = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

    sections.forEach((section, sectionIndex) => {
      rows.forEach((row, rowIndex) => {
        const seatsPerRow = sectionIndex === 0 ? 10 : sectionIndex === 1 ? 15 : 20;
        for (let i = 1; i <= seatsPerRow; i++) {
          const random = Math.random();
          let status: Seat['status'] = 'available';
          if (random > 0.7) status = 'sold';
          else if (random > 0.85) status = 'reserved';

          seats.push({
            id: `${section}${row}${i}`,
            row,
            number: i,
            section: `Section ${section}`,
            status,
            tier: tierId
          });
        }
      });
    });

    return seats;
  }
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [showSeatMap, setShowSeatMap] = useState(false);

  // Fetch event data
  useEffect(() => {
    async function fetchEvent() {
      try {
        const eventData = await EventService.getEvent(eventId);
        if (eventData) {
          setEvent(eventData);
          // Default to first tier
          if (eventData.tiers.length > 0) {
            setSelectedTier(eventData.tiers[0].id);
          }
        } else {
          setError('Event not found');
        }
      } catch (err) {
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [eventId]);

  // Fetch seats when tier changes
  useEffect(() => {
    if (selectedTier && event) {
      async function fetchSeats() {
        const tierId = selectedTier || '';
        const seatData = await EventService.getSeats(eventId, tierId);
        setSeats(seatData);
        setSelectedSeats([]);
        setQuantity(1);
      }
      fetchSeats();
    }
  }, [selectedTier, eventId, event]);

  const selectedTierData = event?.tiers.find(t => t.id === selectedTier);

  const handleSeatClick = (seat: Seat) => {
    if (seat.status !== 'available') return;

    setSelectedSeats(prev => {
      const isSelected = prev.some(s => s.id === seat.id);
      if (isSelected) {
        return prev.filter(s => s.id !== seat.id);
      } else {
        return [...prev, seat];
      }
    });
    setQuantity(selectedSeats.length + 1);
  };

  const subtotal = selectedTierData ? selectedTierData.price * (selectedSeats.length > 0 ? selectedSeats.length : quantity) : 0;
  const serviceFee = subtotal * 0.05;
  const total = subtotal + serviceFee;

  const handleCheckout = () => {
    // Navigate to checkout
    router.push(`/checkout?event=${eventId}&seats=${selectedSeats.map(s => s.id).join(',')}&total=${total}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent animate-spin mx-auto mb-4" />
          <p className="uppercase tracking-widest">Loading Event...</p>
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold uppercase mb-2">Event Not Found</h1>
          <p className="text-mono-light-grey mb-6">{error}</p>
          <Link href="/events" className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white hover:border-white border-2 border-white transition-all">
            Back to Events
          </Link>
        </div>
      </main>
    );
  }

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
          </div>
        </div>
      </nav>

      {/* Hero Image */}
      <div className="relative h-[40vh] md:h-[50vh] overflow-hidden">
        <img 
          src={event.image} 
          alt={event.artist}
          className="w-full h-full object-cover opacity-60 grayscale contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        {/* Back Button */}
        <Link 
          href="/events"
          className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-sm border border-white/20 hover:border-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-bold uppercase">Back</span>
        </Link>

        {/* Event Title */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <div className="container mx-auto">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display font-bold text-3xl md:text-5xl lg:text-6xl uppercase text-white mb-2"
            >
              {event.artist}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-mono-light-grey uppercase tracking-widest"
            >
              {event.tour}
            </motion.p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT - Event Details & Ticket Tiers */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Event Info */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black border border-mono-dark-grey p-6"
            >
              <h2 className="font-display font-bold text-2xl uppercase text-white mb-4">Event Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-white" />
                  <div>
                    <div className="text-xs text-mono-light-grey uppercase tracking-widest">Date</div>
                    <div className="font-bold uppercase">
                      {new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-white" />
                  <div>
                    <div className="text-xs text-mono-light-grey uppercase tracking-widest">Time</div>
                    <div className="font-bold uppercase">19:00 WIB</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:col-span-2">
                  <MapPin className="w-5 h-5 text-white" />
                  <div>
                    <div className="text-xs text-mono-light-grey uppercase tracking-widest">Venue</div>
                    <div className="font-bold uppercase">{event.venue}</div>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-[#CCCCCC] leading-relaxed">{event.description}</p>
            </motion.div>

            {/* Ticket Tiers */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-black border border-mono-dark-grey p-6"
            >
              <h2 className="font-display font-bold text-2xl uppercase text-white mb-6">Select Tickets</h2>
              <div className="space-y-4">
                {event.tiers.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => {
                      setSelectedTier(tier.id);
                      setShowSeatMap(true);
                    }}
                    className={`w-full p-4 border-2 text-left transition-all duration-300 ${
                      selectedTier === tier.id
                        ? 'border-white bg-white/10'
                        : 'border-mono-dark-grey hover:border-white'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-display font-bold text-xl uppercase text-white">{tier.name}</span>
                          {tier.available < 100 && (
                            <span className="text-xs text-red-500 font-bold uppercase animate-pulse">
                              Only {tier.available} left
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-mono-light-grey mb-2">{tier.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {tier.features.slice(0, 3).map((feature, i) => (
                            <span key={i} className="text-xs bg-white/10 px-2 py-1 text-[#CCCCCC]">
                              ✓ {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-display font-bold text-white">
                          IDR {tier.price.toLocaleString('id-ID')}
                        </div>
                        <div className="text-xs text-mono-light-grey uppercase">per ticket</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Seat Map */}
            {selectedTier && showSeatMap && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black border border-mono-dark-grey p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display font-bold text-2xl uppercase text-white">
                    Select Seats - {selectedTierData?.name}
                  </h2>
                  <button 
                    onClick={() => setShowSeatMap(false)}
                    className="text-xs text-mono-light-grey hover:text-white uppercase"
                  >
                    Close
                  </button>
                </div>

                {/* Stage */}
                <div className="mb-8">
                  <div className="w-full h-12 bg-white text-black font-bold uppercase tracking-widest flex items-center justify-center mx-auto max-w-md">
                    STAGE
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-6 justify-center">
                  {[
                    { color: 'bg-white', label: 'Available' },
                    { color: 'bg-red-600', label: 'Sold' },
                    { color: 'bg-yellow-600', label: 'Reserved' },
                    { color: 'bg-blue-600', label: 'Selected' }
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className={`w-4 h-4 ${item.color}`} />
                      <span className="text-xs uppercase">{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Seat Grid */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {['A', 'B', 'C', 'D', 'E'].map((section) => (
                    <div key={section} className="mb-4">
                      <div className="text-xs text-mono-light-grey uppercase mb-2">Section {section}</div>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {seats.filter(s => s.section === `Section ${section}`).slice(0, 20).map((seat) => (
                          <button
                            key={seat.id}
                            onClick={() => handleSeatClick(seat)}
                            disabled={seat.status !== 'available'}
                            className={`w-6 h-6 text-[10px] font-bold transition-all duration-200 ${
                              seat.status === 'sold' 
                                ? 'bg-red-600 cursor-not-allowed'
                                : seat.status === 'reserved'
                                ? 'bg-yellow-600 cursor-not-allowed'
                                : selectedSeats.some(s => s.id === seat.id)
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-black hover:bg-[#CCCCCC]'
                            }`}
                          >
                            {seat.number}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Selection */}
                <div className="mt-6 pt-4 border-t border-mono-dark-grey">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 border border-white flex items-center justify-center hover:bg-white hover:text-black transition-all"
                      >
                        -
                      </button>
                      <span className="text-xl font-bold">{quantity}</span>
                      <button 
                        onClick={() => setQuantity(Math.min(10, quantity + 1))}
                        className="w-10 h-10 border border-white flex items-center justify-center hover:bg-white hover:text-black transition-all"
                      >
                        +
                      </button>
                      <span className="text-sm text-mono-light-grey uppercase">Quantity</span>
                    </div>
                    <button 
                      onClick={() => {
                        const available = seats.filter(s => s.status === 'available').slice(0, quantity);
                        setSelectedSeats(available);
                      }}
                      className="text-xs uppercase text-white hover:underline"
                    >
                      Auto-select {quantity}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* RIGHT - Order Summary */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-24 bg-black border border-white p-6"
            >
              <h2 className="font-display font-bold text-2xl uppercase text-white mb-6">Order Summary</h2>

              {/* Selected Event */}
              <div className="pb-4 border-b border-mono-dark-grey mb-4">
                <div className="text-sm text-mono-light-grey uppercase tracking-widest mb-1">Event</div>
                <div className="font-bold uppercase text-white">{event.artist}</div>
                <div className="text-sm text-[#CCCCCC]">
                  {new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • {event.venue}
                </div>
              </div>

              {/* Selected Tier */}
              {selectedTierData && (
                <div className="pb-4 border-b border-mono-dark-grey mb-4">
                  <div className="text-sm text-mono-light-grey uppercase tracking-widest mb-1">Ticket Type</div>
                  <div className="font-bold uppercase text-white">{selectedTierData.name}</div>
                  <div className="text-sm text-[#CCCCCC]">IDR {selectedTierData.price.toLocaleString('id-ID')} each</div>
                </div>
              )}

              {/* Selected Seats */}
              {selectedSeats.length > 0 && (
                <div className="pb-4 border-b border-mono-dark-grey mb-4">
                  <div className="text-sm text-mono-light-grey uppercase tracking-widest mb-2">Selected Seats</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedSeats.map((seat) => (
                      <span 
                        key={seat.id}
                        className="px-2 py-1 bg-white/10 text-xs text-white"
                      >
                        {seat.section.split(' ')[1]}-{seat.row}{seat.number}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Breakdown */}
              {selectedTierData && (
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#CCCCCC]">
                      {selectedSeats.length > 0 ? selectedSeats.length : quantity} x {selectedTierData.name}
                    </span>
                    <span className="text-white">IDR {subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#CCCCCC]">Service Fee (5%)</span>
                    <span className="text-white">IDR {serviceFee.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-mono-dark-grey">
                    <span className="text-white">Total</span>
                    <span className="text-white">IDR {total.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={selectedSeats.length === 0 && quantity === 0}
                className="w-full py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-5 h-5" />
                Proceed to Checkout
              </button>

              {/* Trust Badges */}
              <div className="mt-6 pt-4 border-t border-mono-dark-grey space-y-3">
                <div className="flex items-center gap-3 text-xs text-[#CCCCCC]">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Secure checkout with SSL encryption</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#CCCCCC]">
                  <Smartphone className="w-4 h-4 text-green-500" />
                  <span>Digital tickets delivered instantly</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#CCCCCC]">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>100% official tickets guaranteed</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
