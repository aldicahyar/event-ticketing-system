'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Ticket, Calendar, CreditCard, Download,
  Search, Eye, ArrowRight
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { OrderRowSkeleton } from '@/components/ui/skeleton';

// Shape mirrors the Prisma booking payload returned by /bookings/my-orders
interface OrderSeat {
  id: string;
  row: string;
  number: number;
  type: 'REGULAR' | 'VIP' | 'PREMIUM';
  price: string | number;
}

interface OrderPayment {
  id: string;
  amount: string | number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  provider: string;
}

interface OrderEvent {
  id: string;
  title: string;
  description?: string;
  startDateTime: string;
  imageUrl?: string | null;
  venue?: {
    id: string;
    name: string;
    city: string;
    address: string;
  } | null;
}

interface Order {
  id: string;
  bookingCode: string;
  userId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  totalPrice: string | number;
  currency: string;
  bookedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  event: OrderEvent;
  seats: OrderSeat[];
  payment: OrderPayment | null;
  _count?: { tickets: number };
}

type FilterKey = 'all' | 'upcoming' | 'completed' | 'cancelled';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Order[]>('/bookings/my-orders');
      setOrders(data ?? []);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const deriveStatus = (order: Order): 'upcoming' | 'completed' | 'cancelled' => {
    if (order.status === 'CANCELLED') return 'cancelled';
    const eventDate = order.event?.startDateTime ? new Date(order.event.startDateTime) : null;
    const now = new Date();
    if (eventDate && eventDate < now) return 'completed';
    return 'upcoming';
  };

  const filteredOrders = orders.filter((order) => {
    const derived = deriveStatus(order);
    const matchesFilter = filter === 'all' || derived === filter;
    const needle = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !needle ||
      (order.event?.title ?? '').toLowerCase().includes(needle) ||
      (order.bookingCode ?? '').toLowerCase().includes(needle);
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

  const formatPrice = (val: string | number, currency = 'IDR') => {
    const num = typeof val === 'number' ? val : Number(val);
    if (!Number.isFinite(num)) return `${currency} 0`;
    return `${currency} ${num.toLocaleString()}`;
  };

  const paymentLabel = (p: OrderPayment | null) => {
    if (!p) return '—';
    const status = p.status.toLowerCase();
    return `${p.provider} · ${status}`;
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display font-bold text-4xl uppercase text-white mb-2">
          Order <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>History</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-sm">
          {'// VIEW_AND_MANAGE_YOUR_ORDERS'}
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col md:flex-row gap-4"
      >
        <div className="relative flex-grow">
          <label htmlFor="orders-search" className="sr-only">Search orders</label>
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
          <input
            id="orders-search"
            type="text"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders…"
            className="w-full bg-black border border-white text-white px-12 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'upcoming', 'completed', 'cancelled'] as FilterKey[]).map((f) => (
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

      {/* Loading - skeleton mirrors the order card layout to prevent CLS */}
      {isLoading && (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          <OrderRowSkeleton />
          <OrderRowSkeleton />
          <OrderRowSkeleton />
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="text-center py-12 border border-red-500/50 bg-red-500/5">
          <p className="text-red-400 text-sm uppercase tracking-widest mb-2">Failed to load orders</p>
          <p className="text-mono-light-grey text-sm mb-4">{error}</p>
          <button
            onClick={loadOrders}
            className="inline-block px-6 py-3 bg-white text-black font-bold uppercase tracking-wide"
          >
            Retry
          </button>
        </div>
      )}

      {/* Orders List */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {filteredOrders.map((order, index) => {
            const derived = deriveStatus(order);
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * (index + 1) }}
                className="bg-black border border-mono-dark-grey"
              >
                {/* Order Header */}
                <div className="p-4 border-b border-mono-dark-grey flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold uppercase text-white">{order.bookingCode}</div>
                      <div className="text-xs text-mono-light-grey">
                        Ordered: {new Date(order.bookedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 text-xs font-bold uppercase ${getStatusColor(derived)}`}>
                      {derived}
                    </span>
                    <Link
                      href={`/dashboard/my-tickets?order=${order.id}`}
                      className="p-2 border border-mono-dark-grey hover:border-white transition-colors"
                      aria-label={`View order ${order.bookingCode}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Order Content */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <div className="flex items-start gap-4">
                      {order.event?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={order.event.imageUrl}
                          alt={order.event.title}
                          className="w-20 h-20 object-cover grayscale"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-white/10 flex items-center justify-center">
                          <Ticket className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-display font-bold uppercase text-white mb-1 truncate">
                          {order.event?.title ?? 'Unknown event'}
                        </h3>
                        {order.event?.venue && (
                          <p className="text-xs text-mono-light-grey mb-2">{order.event.venue.name}</p>
                        )}
                        <div className="flex flex-wrap gap-3 text-xs text-[#CCCCCC]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {order.event?.startDateTime
                              ? new Date(order.event.startDateTime).toLocaleDateString()
                              : '—'}
                          </span>
                          {order.seats[0] && (
                            <span className="flex items-center gap-1">
                              <Ticket className="w-3 h-3" />
                              {order.seats[0].type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between">
                    <div className="text-right mb-4">
                      <div className="text-xl font-display font-bold text-white">
                        {formatPrice(order.totalPrice, order.currency)}
                      </div>
                      <div className="text-xs text-mono-light-grey">
                        {order.seats.length} ticket{order.seats.length > 1 ? 's' : ''} • {paymentLabel(order.payment)}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      {derived === 'upcoming' && (
                        <Link
                          href={`/dashboard/my-tickets?order=${order.id}`}
                          className="px-4 py-2 bg-white text-black text-xs font-bold uppercase hover:bg-transparent hover:text-white border border-white transition-all flex items-center gap-2"
                        >
                          View Tickets <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                      <button
                        className="px-4 py-2 border border-mono-dark-grey text-[#CCCCCC] text-xs font-bold uppercase hover:border-white hover:text-white transition-all flex items-center gap-2"
                        type="button"
                      >
                        <Download className="w-3 h-3" />
                        Invoice
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order Footer */}
                <div className="p-3 bg-white/5 border-t border-mono-dark-grey flex items-center justify-between text-xs text-mono-light-grey">
                  <span>
                    Seats: {order.seats.map((s) => `${s.row}${s.number}`).join(', ') || '—'}
                  </span>
                  <span>{order.event?.venue ? `${order.event.venue.city}` : '—'}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredOrders.length === 0 && (
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
  );
}
