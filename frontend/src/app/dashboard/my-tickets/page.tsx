'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Ticket, Clock, Download, QrCode, MapPin, Calendar
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { TicketCardSkeleton } from '@/components/ui/skeleton';

interface TicketSeat {
  id: string;
  row: string;
  number: number;
  type: 'REGULAR' | 'VIP' | 'PREMIUM';
}

interface TicketItem {
  id: string;
  seat_id: string;
  qr_code: string;
  is_checked_in: boolean;
}

interface TicketEvent {
  id: string;
  title: string;
  description?: string;
  start_date_time: string;
  end_date_time?: string;
  image_url?: string | null;
  venue?: {
    id: string;
    name: string;
    city: string;
    address: string;
  } | null;
}

interface TicketBooking {
  id: string;
  booking_code: string;
  total_price: string | number;
  currency: string;
  event: TicketEvent;
  seats: TicketSeat[];
  tickets: TicketItem[];
}

export default function MyTicketsPage() {
  const [bookings, setBookings] = useState<TicketBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<TicketBooking[]>('/bookings/my-tickets');
      setBookings(data ?? []);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const isUpcoming = (b: TicketBooking) => {
    const start = b.event?.start_date_time ? new Date(b.event.start_date_time) : null;
    return start ? start.getTime() >= Date.now() : false;
  };

  const filteredTickets = bookings.filter((b) =>
    filter === 'upcoming' ? isUpcoming(b) : !isUpcoming(b)
  );

  const formatPrice = (val: string | number, currency = 'IDR') => {
    const num = typeof val === 'number' ? val : Number(val);
    if (!Number.isFinite(num)) return `${currency} 0`;
    return `${currency} ${num.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display font-bold text-4xl uppercase text-white mb-2">
          My <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Tickets</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-sm">
          {'// YOUR_E_TICKETS_AND_PASSES'}
        </p>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['upcoming', 'past'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-6 py-3 text-sm font-bold uppercase border transition-all whitespace-nowrap ${
              filter === f
                ? 'bg-white text-black border-white'
                : 'bg-black text-[#CCCCCC] border-mono-dark-grey hover:border-white'
            }`}
          >
            {f === 'upcoming' ? 'Upcoming' : 'Past Events'}
          </button>
        ))}
      </div>

      {/* Loading - skeleton mirrors the ticket card layout */}
      {isLoading && (
        <div className="space-y-6" aria-busy="true" aria-live="polite">
          <TicketCardSkeleton />
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="text-center py-12 border border-red-500/50 bg-red-500/5">
          <p className="text-red-400 text-sm uppercase tracking-widest mb-2">Failed to load tickets</p>
          <p className="text-mono-light-grey text-sm mb-4">{error}</p>
          <button
            onClick={loadTickets}
            className="inline-block px-6 py-3 bg-white text-black font-bold uppercase tracking-wide"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tickets */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {filteredTickets.map((ticket, index) => {
            const startDate = ticket.event?.start_date_time ? new Date(ticket.event.start_date_time) : null;
            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * (index + 1) }}
                className="bg-black border border-mono-dark-grey"
              >
                {/* Event Header */}
                <div className="relative">
                  {ticket.event?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ticket.event.image_url}
                      alt={ticket.event.title}
                      className="w-full h-48 object-cover opacity-40 grayscale"
                    />
                  ) : (
                    <div className="w-full h-48 bg-white/5 flex items-center justify-center">
                      <Ticket className="w-12 h-12 text-mono-light-grey" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 mb-2">
                      {ticket.seats[0] && (
                        <span className="px-2 py-1 bg-white text-black text-xs font-bold uppercase">
                          {ticket.seats[0].type}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-green-500 text-black text-xs font-bold uppercase">
                        {isUpcoming(ticket) ? 'Upcoming' : 'Past'}
                      </span>
                    </div>
                    <h2 className="font-display font-bold text-2xl md:text-3xl uppercase text-white">
                      {ticket.event?.title ?? 'Unknown event'}
                    </h2>
                    {ticket.event?.venue && (
                      <p className="text-sm text-mono-light-grey uppercase tracking-widest">
                        {ticket.event.venue.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left - Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-white" />
                      <div>
                        <div className="text-xs text-mono-light-grey uppercase">Date</div>
                        <div className="font-bold">
                          {startDate
                            ? startDate.toLocaleDateString('en-GB', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </div>
                      </div>
                    </div>
                    {ticket.event?.start_date_time && (
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-white" />
                        <div>
                          <div className="text-xs text-mono-light-grey uppercase">Time</div>
                          <div className="font-bold">
                            {new Date(ticket.event.start_date_time).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' WIB'}
                          </div>
                        </div>
                      </div>
                    )}
                    {ticket.event?.venue && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-white mt-0.5" />
                        <div>
                          <div className="text-xs text-mono-light-grey uppercase">Venue</div>
                          <div className="font-bold uppercase">{ticket.event.venue.name}</div>
                          <div className="text-xs text-[#CCCCCC]">{ticket.event.venue.address}</div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <QrCode className="w-5 h-5 text-white" />
                      <div>
                        <div className="text-xs text-mono-light-grey uppercase">Order Code</div>
                        <div className="font-bold">{ticket.booking_code}</div>
                      </div>
                    </div>
                  </div>

                  {/* Right - QR Codes */}
                  <div>
                    <h3 className="font-bold uppercase text-white mb-3 flex items-center gap-2">
                      <QrCode className="w-5 h-5" />
                      Your Tickets ({ticket.seats.length})
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {ticket.seats.map((seat, idx) => {
                        // Match the ticket to its seat by seat_id — the seats and
                        // tickets arrays are ordered independently by the API, so
                        // pairing by array index shows the wrong QR under a seat.
                        const tick =
                          ticket.tickets.find((t) => t.seat_id === seat.id) ??
                          ticket.tickets[idx];
                        return (
                          <div
                            key={seat.id}
                            className="bg-white p-3 border-2 border-black"
                          >
                            <div className="text-center mb-2">
                              <div className="text-xs text-mono-light-grey uppercase mb-1">Seat</div>
                              <div className="font-display font-bold text-xl text-black">
                                Row {seat.row} - No. {seat.number}
                              </div>
                            </div>
                            <div className="bg-black aspect-square flex items-center justify-center">
                              <QrCode className="w-16 h-16 text-white" />
                            </div>
                            <div className="text-center mt-2 text-[10px] text-mono-light-grey font-mono break-all">
                              {tick?.qr_code ?? '—'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-mono-dark-grey flex flex-col sm:flex-row gap-3 justify-between">
                  <div className="flex items-center gap-2 text-sm text-mono-light-grey">
                    <span>Total: {formatPrice(ticket.total_price, ticket.currency)}</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 border border-mono-dark-grey text-[#CCCCCC] text-xs font-bold uppercase hover:border-white hover:text-white transition-all flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download All
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-white text-black border border-white text-xs font-bold uppercase hover:bg-transparent hover:text-white transition-all flex items-center gap-2"
                    >
                      <QrCode className="w-4 h-4" />
                      Add to Wallet
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredTickets.length === 0 && (
        <div className="text-center py-12 border border-mono-dark-grey">
          <Ticket className="w-12 h-12 text-mono-dark-grey mx-auto mb-4" />
          <h3 className="font-bold uppercase text-white mb-2">No tickets yet</h3>
          <p className="text-mono-light-grey text-sm mb-4">
            Purchase tickets to see them here
          </p>
          <Link
            href="/events"
            className="inline-block px-6 py-3 bg-white text-black font-bold uppercase tracking-wide"
          >
            Browse Events
          </Link>
        </div>
      )}
    </div>
  );
}
