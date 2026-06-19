'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Calendar, MapPin, 
  ChevronLeft, ChevronRight, Shield, Clock,
  CreditCard, Smartphone, CheckCircle, AlertCircle
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';

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
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent animate-spin mx-auto mb-4" aria-hidden="true" />
          <p className="uppercase tracking-widest">Loading Event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-bold uppercase mb-2">Event Not Found</h1>
          <p className="text-mono-light-grey mb-6">{error}</p>
          <Link
            href="/events"
            className="inline-block px-6 py-3 min-h-touch bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white hover:border-white border-2 border-white transition-all focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      {/* Shared Navbar */}
      <Navbar links={[{ href: '/events', label: 'Events' }, { href: '/venues', label: 'Venues' }, { href: '/lineup', label: 'Lineup' }]} showAuth={false} />

      {/* Hero Image */}
      <div className="relative h-[30vh] sm:h-[35vh] md:h-[50vh] overflow-hidden">
        <img 
          src={event.image} 
          alt={`${event.artist} concert performance`}
          className="w-full h-full object-cover opacity-60 grayscale contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        {/* Back Button */}
        <Link 
          href="/events"
          aria-label="Back to events"
          className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-2 px-4 py-2 min-h-touch bg-black/50 backdrop-blur-sm border border-white/20 hover:border-white transition-all focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm font-bold uppercase">Back</span>
        </Link>

        {/* Event Title */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <div className="container mx-auto">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display font-bold text-2xl sm:text-3xl md:text-5xl lg:text-6xl uppercase text-white mb-2"
            >
              {event.artist}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm sm:text-base md:text-lg lg:text-xl text-mono-light-grey uppercase tracking-widest"
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
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              aria-labelledby="event-details-heading"
              className="bg-black border border-mono-dark-grey p-4 md:p-6"
            >
              <h2 id="event-details-heading" className="font-display font-bold text-2xl uppercase text-white mb-4">Event Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-white" aria-hidden="true" />
                  <div>
                    <div className="text-xs text-mono-light-grey uppercase tracking-widest">Date</div>
                    <div className="font-bold uppercase">
                      {new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-white" aria-hidden="true" />
                  <div>
                    <div className="text-xs text-mono-light-grey uppercase tracking-widest">Time</div>
                    <div className="font-bold uppercase">19:00 WIB</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:col-span-2">
                  <MapPin className="w-5 h-5 text-white" aria-hidden="true" />
                  <div>
                    <div className="text-xs text-mono-light-grey uppercase tracking-widest">Venue</div>
                    <div className="font-bold uppercase">{event.venue}</div>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-[#CCCCCC] leading-relaxed">{event.description}</p>
            </motion.section>

            {/* Ticket Tiers */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              aria-labelledby="select-tickets-heading"
              className="bg-black border border-mono-dark-grey p-4 md:p-6"
            >
              <h2 id="select-tickets-heading" className="font-display font-bold text-2xl uppercase text-white mb-6">Select Tickets</h2>
              <div className="space-y-4" role="group" aria-label="Ticket tier selection">
                {event.tiers.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => {
                      setSelectedTier(tier.id);
                      setShowSeatMap(true);
                    }}
                    aria-pressed={selectedTier === tier.id}
                    aria-label={`${tier.name} tier - IDR ${tier.price.toLocaleString('id-ID')} per ticket, ${tier.available} available`}
                    className={`w-full p-4 min-h-touch border-2 text-left transition-all duration-300 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
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
                            <span className="text-xs text-red-500 font-bold uppercase animate-pulse" aria-label={`Only ${tier.available} tickets left`}>
                              Only {tier.available} left
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-mono-light-grey mb-2">{tier.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {tier.features.slice(0, 3).map((feature, i) => (
                            <span key={i} className="text-xs bg-white/10 px-2 py-1 text-[#CCCCCC]">
                              {feature}
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
            </motion.section>

            {/* Seat Map */}
            {selectedTier && showSeatMap && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                aria-labelledby="seat-map-heading"
                className="bg-black border border-mono-dark-grey p-4 md:p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 id="seat-map-heading" className="font-display font-bold text-2xl uppercase text-white">
                    Select Seats - {selectedTierData?.name}
                  </h2>
                  <button 
                    onClick={() => setShowSeatMap(false)}
                    className="text-xs text-mono-light-grey hover:text-white uppercase min-h-touch min-w-touch flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    Close
                  </button>
                </div>

                {/* Stage */}
                <div className="mb-8">
                  <div className="w-full h-12 bg-white text-black font-bold uppercase tracking-widest flex items-center justify-center mx-auto max-w-md" aria-hidden="true">
                    STAGE
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-6 justify-center" role="group" aria-label="Seat status legend">
                  {[
                    { color: 'bg-white', label: 'Available', textColor: 'text-black' },
                    { color: 'bg-red-600', label: 'Sold', textColor: 'text-white' },
                    { color: 'bg-yellow-600', label: 'Reserved', textColor: 'text-white' },
                    { color: 'bg-blue-600', label: 'Selected', textColor: 'text-white' }
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className={`w-4 h-4 ${item.color}`} role="img" aria-label={`${item.label} seat indicator`} />
                      <span className="text-xs uppercase">{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Seat Grid */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto" role="group" aria-label="Seat selection grid">
                  {['A', 'B', 'C', 'D', 'E'].map((section) => (
                    <div key={section} className="mb-4">
                      <div className="text-xs text-mono-light-grey uppercase mb-2" id={`section-${section}-label`}>Section {section}</div>
                      <div className="flex flex-wrap gap-1 justify-center" role="group" aria-labelledby={`section-${section}-label`}>
                        {seats.filter(s => s.section === `Section ${section}`).slice(0, 20).map((seat) => (
                          <button
                            key={seat.id}
                            onClick={() => handleSeatClick(seat)}
                            disabled={seat.status !== 'available'}
                            aria-label={`Seat ${seat.section} Row ${seat.row} Seat ${seat.number} - ${seat.status}`}
                            aria-pressed={selectedSeats.some(s => s.id === seat.id)}
                            className={`w-7 h-7 md:w-8 md:h-8 text-[10px] font-bold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        aria-label="Decrease quantity"
                        className="w-10 h-10 min-h-touch min-w-touch border border-white flex items-center justify-center hover:bg-white hover:text-black transition-all focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                      >
                        -
                      </button>
                      <span className="text-xl font-bold" aria-live="polite" aria-label={`${quantity} tickets`}>{quantity}</span>
                      <button 
                        onClick={() => setQuantity(Math.min(10, quantity + 1))}
                        aria-label="Increase quantity"
                        className="w-10 h-10 min-h-touch min-w-touch border border-white flex items-center justify-center hover:bg-white hover:text-black transition-all focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
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
                      className="text-xs uppercase text-white hover:underline min-h-touch flex items-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                    >
                      Auto-select {quantity}
                    </button>
                  </div>
                </div>
              </motion.section>
            )}
          </div>

          {/* RIGHT - Order Summary */}
          <div className="lg:col-span-1">
            <motion.section 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              aria-labelledby="order-summary-heading"
              className="sticky top-24 bg-black border border-white p-4 md:p-6"
            >
              <h2 id="order-summary-heading" className="font-display font-bold text-2xl uppercase text-white mb-6">Order Summary</h2>

              {/* Selected Event */}
              <div className="pb-4 border-b border-mono-dark-grey mb-4">
                <div className="text-sm text-mono-light-grey uppercase tracking-widest mb-1">Event</div>
                <div className="font-bold uppercase text-white">{event.artist}</div>
                <div className="text-sm text-[#CCCCCC]">
                  {new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} &bull; {event.venue}
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
                <dl className="space-y-2 mb-6" aria-label="Price breakdown">
                  <div className="flex justify-between text-sm">
                    <dt className="text-[#CCCCCC]">
                      {selectedSeats.length > 0 ? selectedSeats.length : quantity} x {selectedTierData.name}
                    </dt>
                    <dd className="text-white">IDR {subtotal.toLocaleString('id-ID')}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-[#CCCCCC]">Service Fee (5%)</dt>
                    <dd className="text-white">IDR {serviceFee.toLocaleString('id-ID')}</dd>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-mono-dark-grey">
                    <dt className="text-white">Total</dt>
                    <dd className="text-white" aria-live="polite">IDR {total.toLocaleString('id-ID')}</dd>
                  </div>
                </dl>
              )}

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={selectedSeats.length === 0 && quantity === 0}
                className="w-full py-4 min-h-touch bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              >
                <CreditCard className="w-5 h-5" aria-hidden="true" />
                Proceed to Checkout
              </button>

              {/* Trust Badges */}
              <div className="mt-6 pt-4 border-t border-mono-dark-grey space-y-3">
                <div className="flex items-center gap-3 text-xs text-[#CCCCCC]">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 shrink-0" aria-hidden="true" />
                  <span>Secure checkout with SSL encryption</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#CCCCCC]">
                  <Smartphone className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 shrink-0" aria-hidden="true" />
                  <span>Digital tickets delivered instantly</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#CCCCCC]">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 shrink-0" aria-hidden="true" />
                  <span>100% official tickets guaranteed</span>
                </div>
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}
