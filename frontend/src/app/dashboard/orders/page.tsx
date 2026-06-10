'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  User, Ticket, Clock, Settings, LogOut, 
  ArrowRight, Calendar, CreditCard, Bell, Download,
  ChevronRight, Filter, Search, Eye, Printer
} from 'lucide-react';

const ORDERS = [
  {
    id: 'ORD-2024-001',
    date: '2024-12-01',
    event: 'BRING ME THE HORIZON',
    tour: 'POST HUMAN: SURVIVAL HORROR',
    dateEvent: '2026-03-15',
    venue: 'Jakarta GBK Stadium',
    tickets: 2,
    tier: 'VIP',
    seats: ['A-5', 'A-6'],
    total: 3000000,
    status: 'upcoming',
    paymentMethod: 'Credit Card',
    last4: '4242'
  },
  {
    id: 'ORD-2024-002',
    date: '2024-11-15',
    event: 'BAD OMENS',
    tour: 'THE DEATH OF PEACE OF MIND',
    dateEvent: '2026-05-20',
    venue: 'Jakarta ICE BSD',
    tickets: 1,
    tier: 'Premium',
    seats: ['B-12'],
    total: 850000,
    status: 'upcoming',
    paymentMethod: 'Bank Transfer',
    last4: 'BCA'
  },
  {
    id: 'ORD-2024-003',
    date: '2024-10-01',
    event: 'NORTHLANE',
    tour: 'CHARACTER CHANGE TOUR',
    dateEvent: '2024-11-20',
    venue: 'Surabaya Grand City',
    tickets: 3,
    tier: 'Standard',
    seats: ['C-8', 'C-9', 'C-10'],
    total: 1350000,
    status: 'completed',
    paymentMethod: 'E-Wallet',
    last4: 'DANA'
  },
  {
    id: 'ORD-2024-004',
    date: '2024-08-20',
    event: 'FIT FOR A KING',
    tour: 'DEATHGRIP WORLD TOUR',
    dateEvent: '2024-09-05',
    venue: 'Jakarta Matraman',
    tickets: 2,
    tier: 'Premium',
    seats: ['A-15', 'A-16'],
    total: 1700000,
    status: 'completed',
    paymentMethod: 'Credit Card',
    last4: '1234'
  },
  {
    id: 'ORD-2024-005',
    date: '2024-06-10',
    event: 'THORNILL',
    tour: 'MOMENTS OF CLARITY TOUR',
    dateEvent: '2024-07-15',
    venue: 'Bali Jimbarana',
    tickets: 4,
    tier: 'Standard',
    seats: ['D-1', 'D-2', 'D-3', 'D-4'],
    total: 1600000,
    status: 'completed',
    paymentMethod: 'Credit Card',
    last4: '5678'
  }
];

const DASHBOARD_LINKS = [
  { href: '/dashboard', label: 'Overview', icon: CreditCard },
  { href: '/dashboard/orders', label: 'Orders', icon: CreditCard },
  { href: '/dashboard/my-tickets', label: 'My Tickets', icon: Ticket },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];

export default function OrdersPage() {
  const pathname = usePathname();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = ORDERS.filter(order => {
    const matchesFilter = filter === 'all' || order.status === filter;
    const matchesSearch = order.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-green-500 text-black';
      case 'completed': return 'bg-[#666] text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      default: return 'bg-mono-dark-grey text-white';
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
                Order <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>History</span>
              </h1>
              <p className="text-mono-light-grey uppercase tracking-widest text-sm">
                // VIEW_AND_MANAGE_YOUR_ORDERS
              </p>
            </motion.div>

            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col md:flex-row gap-4"
            >
              {/* Search */}
              <div className="relative flex-grow">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search orders..."
                  className="w-full bg-black border border-white text-white px-12 py-3 focus:outline-none focus:border-white/50"
                />
              </div>
              
              {/* Status Filter */}
              <div className="flex gap-2">
                {['all', 'upcoming', 'completed'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-3 text-sm font-bold uppercase border transition-all ${
                      filter === f
                        ? 'bg-white text-black border-white'
                        : 'bg-black text-[#CCCCCC] border-mono-dark-grey hover:border-white'
                    }`}
                  >
                    {f === 'all' ? 'All' : f}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Orders List */}
            <div className="space-y-4">
              {filteredOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                  className="bg-black border border-mono-dark-grey"
                >
                  {/* Order Header */}
                  <div className="p-4 border-b border-mono-dark-grey flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-bold uppercase text-white">{order.id}</div>
                        <div className="text-xs text-mono-light-grey">
                          Ordered: {new Date(order.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 text-xs font-bold uppercase ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <button className="p-2 border border-mono-dark-grey hover:border-white transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Order Content */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Event Info */}
                    <div className="md:col-span-2">
                      <div className="flex items-start gap-4">
                        <img 
                          src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=200&auto=format&fit=crop"
                          alt={order.event}
                          className="w-20 h-20 object-cover grayscale"
                        />
                        <div>
                          <h3 className="font-display font-bold uppercase text-white mb-1">
                            {order.event}
                          </h3>
                          <p className="text-xs text-mono-light-grey mb-2">{order.tour}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-[#CCCCCC]">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(order.dateEvent).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Ticket className="w-3 h-3" />
                              {order.tier}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="flex flex-col justify-between">
                      <div className="text-right mb-4">
                        <div className="text-xl font-display font-bold text-white">
                          IDR {order.total.toLocaleString()}
                        </div>
                        <div className="text-xs text-mono-light-grey">
                          {order.tickets} ticket{order.tickets > 1 ? 's' : ''} • {order.paymentMethod}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        {order.status === 'upcoming' && (
                          <Link 
                            href={`/dashboard/my-tickets/${order.id}`}
                            className="px-4 py-2 bg-white text-black text-xs font-bold uppercase hover:bg-transparent hover:text-white border border-white transition-all flex items-center gap-2"
                          >
                            View Tickets <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                        <button className="px-4 py-2 border border-mono-dark-grey text-[#CCCCCC] text-xs font-bold uppercase hover:border-white hover:text-white transition-all flex items-center gap-2">
                          <Download className="w-3 h-3" />
                          Invoice
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Order Footer */}
                  <div className="p-3 bg-white/5 border-t border-mono-dark-grey flex items-center justify-between text-xs text-mono-light-grey">
                    <span>Seats: {order.seats.join(', ')}</span>
                    <span>{order.venue}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Empty State */}
            {filteredOrders.length === 0 && (
              <div className="text-center py-12 border border-mono-dark-grey">
                <CreditCard className="w-12 h-12 text-mono-dark-grey mx-auto mb-4" />
                <h3 className="font-bold uppercase text-white mb-2">No orders found</h3>
                <p className="text-mono-light-grey text-sm mb-4">
                  {searchQuery ? 'Try adjusting your search' : 'Start shopping to see your orders here'}
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
    </main>
  );
}
