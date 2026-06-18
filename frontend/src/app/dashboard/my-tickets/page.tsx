'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  User, Ticket, Clock, Settings, LogOut, 
  ArrowRight, Calendar, CreditCard, Bell, Download,
  QrCode, MapPin, ChevronRight, Filter
} from 'lucide-react';

const MY_TICKETS = [
  {
    id: 'ORD-2024-001',
    event: 'BRING ME THE HORIZON',
    tour: 'POST HUMAN: SURVIVAL HORROR',
    date: '2026-03-15',
    time: '19:00 WIB',
    venue: 'Jakarta GBK Stadium',
    address: 'Gelora Bung Karno, Jakarta Pusat',
    tier: 'VIP',
    seats: [
      { id: 'A-5', row: 'A', number: 5, qrCode: 'BMTH-VIP-A5-2026' },
      { id: 'A-6', row: 'A', number: 6, qrCode: 'BMTH-VIP-A6-2026' }
    ],
    total: 3000000,
    status: 'upcoming',
    gate: 'Gate A'
  },
  {
    id: 'ORD-2024-002',
    event: 'BAD OMENS',
    tour: 'THE DEATH OF PEACE OF MIND',
    date: '2026-05-20',
    time: '20:00 WIB',
    venue: 'Jakarta ICE BSD',
    address: 'ICE BSD City, Tangerang',
    tier: 'Premium',
    seats: [
      { id: 'B-12', row: 'B', number: 12, qrCode: 'BO-PREM-B12-2026' }
    ],
    total: 850000,
    status: 'upcoming',
    gate: 'Gate B'
  }
];

const DASHBOARD_LINKS = [
  { href: '/dashboard', label: 'Overview', icon: CreditCard },
  { href: '/dashboard/orders', label: 'Orders', icon: CreditCard },
  { href: '/dashboard/my-tickets', label: 'My Tickets', icon: Ticket },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];

export default function MyTicketsPage() {
  const pathname = usePathname();
  const [filter, setFilter] = useState('upcoming');

  const filteredTickets = MY_TICKETS.filter(t => t.status === filter);

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white" />
            <span className="text-xl font-display font-bold uppercase">EventTicket.</span>
          </Link>
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-white/10 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-black" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-black border border-mono-dark-grey p-4 sticky top-24">
              <nav className="space-y-1">
                {DASHBOARD_LINKS.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 px-4 py-3 transition-all ${
                        isActive 
                          ? 'bg-white text-black' 
                          : 'text-[#CCCCCC] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <link.icon className="w-5 h-5" />
                      <span className="font-bold uppercase text-sm">{link.label}</span>
                    </Link>
                  );
                })}
                <button className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-600/10 transition-all">
                  <LogOut className="w-5 h-5" />
                  <span className="font-bold uppercase text-sm">Sign Out</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="font-display font-bold text-4xl uppercase text-white mb-2">
                My <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Tickets</span>
              </h1>
              <p className="text-mono-light-grey uppercase tracking-widest text-sm">
                // YOUR_E_TICKETS_AND_PASSES
              </p>
            </motion.div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {['upcoming', 'past'].map((f) => (
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

            {/* Tickets */}
            <div className="space-y-6">
              {filteredTickets.map((ticket, index) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                  className="bg-black border border-mono-dark-grey"
                >
                  {/* Event Header */}
                  <div className="relative">
                    <img 
                      src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop"
                      alt={ticket.event}
                      className="w-full h-48 object-cover opacity-40 grayscale"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-white text-black text-xs font-bold uppercase">
                          {ticket.tier}
                        </span>
                        <span className="px-2 py-1 bg-green-500 text-black text-xs font-bold uppercase">
                          Upcoming
                        </span>
                      </div>
                      <h2 className="font-display font-bold text-2xl md:text-3xl uppercase text-white">
                        {ticket.event}
                      </h2>
                      <p className="text-sm text-mono-light-grey uppercase tracking-widest">
                        {ticket.tour}
                      </p>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left - Details */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-white" />
                          <div>
                            <div className="text-xs text-mono-light-grey uppercase">Date</div>
                            <div className="font-bold">
                              {new Date(ticket.date).toLocaleDateString('en-GB', { 
                                weekday: 'short', 
                                day: 'numeric', 
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-white" />
                          <div>
                            <div className="text-xs text-mono-light-grey uppercase">Time</div>
                            <div className="font-bold">{ticket.time}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-white mt-0.5" />
                        <div>
                          <div className="text-xs text-mono-light-grey uppercase">Venue</div>
                          <div className="font-bold uppercase">{ticket.venue}</div>
                          <div className="text-xs text-[#CCCCCC]">{ticket.address}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <QrCode className="w-5 h-5 text-white" />
                        <div>
                          <div className="text-xs text-mono-light-grey uppercase">Gate Entry</div>
                          <div className="font-bold">{ticket.gate}</div>
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
                        {ticket.seats.map((seat) => (
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
                            <div className="text-center mt-2 text-[10px] text-mono-light-grey font-mono">
                              {seat.qrCode}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 border-t border-mono-dark-grey flex flex-col sm:flex-row gap-3 justify-between">
                    <div className="flex items-center gap-2 text-sm text-mono-light-grey">
                      <span>Order: {ticket.id}</span>
                    </div>
                    <div className="flex gap-3">
                      <button className="px-4 py-2 border border-mono-dark-grey text-[#CCCCCC] text-xs font-bold uppercase hover:border-white hover:text-white transition-all flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Download All
                      </button>
                      <button className="px-4 py-2 bg-white text-black border border-white text-xs font-bold uppercase hover:bg-transparent hover:text-white transition-all flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        Add to Wallet
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Empty State */}
            {filteredTickets.length === 0 && (
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
        </div>
      </div>
    </div>
  );
}
