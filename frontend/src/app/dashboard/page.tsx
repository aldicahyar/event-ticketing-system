'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Ticket, ArrowRight, Calendar, CreditCard,
  Shield, TrendingUp, Users, Loader2
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

interface OrderEvent {
  id: string;
  title: string;
  startDateTime: string;
  imageUrl?: string | null;
  venue?: { id: string; name: string; city: string } | null;
}

interface Order {
  id: string;
  bookingCode: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  totalPrice: string | number;
  currency: string;
  bookedAt: string;
  event: OrderEvent;
  seats: { id: string }[];
  _count?: { tickets: number };
}

interface UserStats {
  totalOrders: number;
  totalTickets: number;
  totalSpent: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [currentUser, setCurrentUser] = useState({
    firstName: 'User',
    lastName: '',
    email: '',
    memberSince: new Date().toISOString(),
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalOrders: 0,
    totalTickets: 0,
    totalSpent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>('ATTENDEE');

  // Redirect ADMIN users to the admin area on mount.
  // ORGANIZER & ATTENDEE see the regular overview.
  useEffect(() => {
    const storedUser = apiClient.getUser();
    if (storedUser?.role === 'ADMIN') {
      router.replace('/dashboard/admin/stats');
    }
  }, [router]);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [orders, userStats] = await Promise.all([
        apiClient.get<Order[]>('/bookings/my-orders').catch(() => [] as Order[]),
        apiClient
          .get<UserStats>('/bookings/my-stats')
          .catch(() => ({ totalOrders: 0, totalTickets: 0, totalSpent: 0 })),
      ]);
      // Keep the full list; the "recent" and "upcoming" views are derived below.
      setOrders(orders ?? []);
      setStats(
        userStats ?? { totalOrders: 0, totalTickets: 0, totalSpent: 0 },
      );
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    const storedUser = apiClient.getUser();
    if (storedUser) {
      const nameParts = (storedUser.name || '').split(' ');
      setCurrentUser({
        firstName: nameParts[0] || 'User',
        lastName: nameParts.slice(1).join(' ') || '',
        email: storedUser.email || '',
        memberSince: new Date().toISOString(),
      });
      setRole(storedUser.role || 'ATTENDEE');
    }

    loadDashboardData();
  }, [user, loadDashboardData]);

  const formatPrice = (val: string | number, currency = 'IDR') => {
    const num = typeof val === 'number' ? val : Number(val);
    if (!Number.isFinite(num)) return `${currency} 0`;
    return `${currency} ${num.toLocaleString()}`;
  };

  const isUpcoming = (o: Order) => {
    if (!o.event?.startDateTime) return false;
    return new Date(o.event.startDateTime).getTime() >= Date.now();
  };

  // Recent = the 3 latest bookings (list is sorted bookedAt desc by the API).
  const recentOrders = orders.slice(0, 3);
  // Upcoming = every order whose event is still in the future, soonest first —
  // derived from the FULL list, not just the 3 most recently booked.
  const upcomingOrders = orders
    .filter(isUpcoming)
    .sort(
      (a, b) =>
        new Date(a.event.startDateTime).getTime() -
        new Date(b.event.startDateTime).getTime(),
    )
    .slice(0, 4);

  // ADMIN doesn't have personal orders/tickets — show admin-scoped dashboard instead.
  const isAdmin = role === 'ADMIN';
  const isAttendeeOrOrganizer = role === 'ATTENDEE' || role === 'ORGANIZER';

  const attendeeStats = [
    { label: 'Total Orders', value: stats.totalOrders, icon: CreditCard },
    { label: 'Tickets Bought', value: stats.totalTickets, icon: Ticket },
    { label: 'Loyalty Points', value: '0', icon: Users },
    { label: 'Total Spent', value: `IDR ${(stats.totalSpent / 1000000).toFixed(1)}M`, icon: TrendingUp },
  ];

  const adminQuickLinks = [
    { href: '/dashboard/events', label: 'Manage Events', icon: Calendar },
    { href: '/dashboard/venues', label: 'Manage Venues', icon: Shield },
    { href: '/dashboard/tier-settings', label: 'Tier Settings', icon: Users },
    { href: '/dashboard/tax-settings', label: 'Tax Settings', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 md:space-y-8">

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display font-bold text-2xl md:text-4xl uppercase text-white mb-2">
          {greeting}, <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>
            {currentUser.firstName}
          </span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
          {'// WELCOME_BACK'}
        </p>
      </motion.div>

      {/* Stats Cards - attendee stats for ATTENDEE/ORGANIZER, quick actions for ADMIN */}
      {isAttendeeOrOrganizer ? (
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {attendeeStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-black border border-mono-dark-grey p-3 md:p-4 hover:border-white transition-colors"
            >
              <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-white mb-2 md:mb-3" aria-hidden="true" />
              <div className="text-xl md:text-2xl font-display font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-[10px] md:text-xs text-mono-light-grey uppercase tracking-widest">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {adminQuickLinks.map((link, index) => (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={link.href}
                className="block bg-black border border-mono-dark-grey p-3 md:p-4 hover:border-white transition-colors focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              >
                <link.icon className="w-5 h-5 md:w-6 md:h-6 text-white mb-2 md:mb-3" aria-hidden="true" />
                <div className="font-display font-bold text-white mb-1 uppercase text-sm md:text-base">
                  {link.label}
                </div>
                <div className="text-[10px] md:text-xs text-mono-light-grey uppercase tracking-widest">
                  Open &rarr;
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* ATTENDEE/ORGANIZER-only sections: Recent Orders, Upcoming Events, Membership Card.
          ADMIN sees only the quick-action links above (no personal orders/membership). */}
      {isAttendeeOrOrganizer && (
        <>
      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-black border border-mono-dark-grey"
      >
        <div className="p-3 md:p-4 border-b border-mono-dark-grey flex items-center justify-between">
          <h2 className="font-display font-bold text-lg md:text-xl uppercase text-white">
            Recent Orders
          </h2>
          <Link
            href="/dashboard/orders"
            className="text-xs text-white hover:underline uppercase focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
          >
            View All
          </Link>
        </div>

        {isLoading && (
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" aria-hidden="true" />
            <span className="ml-3 text-mono-light-grey uppercase tracking-widest text-xs">Loading…</span>
          </div>
        )}

        {!isLoading && error && (
          <div className="p-6 text-center">
            <p className="text-red-400 text-xs uppercase tracking-widest mb-2">Failed to load orders</p>
            <p className="text-mono-light-grey text-sm">{error}</p>
          </div>
        )}

        {!isLoading && !error && recentOrders.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-mono-light-grey text-sm">No orders yet.</p>
            <Link
              href="/events"
              className="inline-block mt-3 px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wide"
            >
              Browse Events
            </Link>
          </div>
        )}

        {!isLoading && !error && recentOrders.length > 0 && (
          <div className="divide-y divide-mono-dark-grey">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white/5 transition-colors gap-3 sm:gap-4"
              >
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 flex items-center justify-center shrink-0" aria-hidden="true">
                    <Ticket className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold uppercase text-white text-sm md:text-base truncate">
                      {order.event?.title ?? 'Unknown event'}
                    </div>
                    <div className="text-xs text-mono-light-grey">
                      {order.bookingCode} &middot; {new Date(order.bookedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                  <div className="text-left sm:text-right">
                    <div className="font-bold text-white text-sm">
                      {formatPrice(order.totalPrice, order.currency)}
                    </div>
                    <div className="text-xs text-mono-light-grey">
                      {order.seats.length} ticket{order.seats.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <Link
                    href="/dashboard/my-tickets"
                    className="p-2 border border-mono-dark-grey hover:border-white transition-colors min-h-touch min-w-touch flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                    aria-label={`View tickets for ${order.bookingCode}`}
                  >
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Upcoming Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-black border border-mono-dark-grey"
      >
        <div className="p-3 md:p-4 border-b border-mono-dark-grey">
          <h2 className="font-display font-bold text-lg md:text-xl uppercase text-white">
            Upcoming Events
          </h2>
        </div>
        <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {upcomingOrders.length === 0 && !isLoading && (
            <p className="text-mono-light-grey text-sm col-span-full">No upcoming events.</p>
          )}
          {upcomingOrders.map((order) => (
            <div key={order.id} className="bg-white/5 p-3 md:p-4 border border-mono-dark-grey">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 mr-2">
                  <div className="font-display font-bold uppercase text-white text-sm md:text-base mb-1 truncate">
                    {order.event?.title ?? 'Unknown event'}
                  </div>
                  <div className="text-xs text-mono-light-grey">
                    {order.event?.venue?.name ?? '—'}
                  </div>
                </div>
                <span className="px-2 py-1 bg-white text-black text-xs font-bold uppercase shrink-0">
                  Upcoming
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm text-[#CCCCCC] mb-3">
                <Calendar className="w-3 h-3 md:w-4 md:h-4 shrink-0" aria-hidden="true" />
                {order.event?.startDateTime
                  ? new Date(order.event.startDateTime).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'}
              </div>
              <Link
                href="/dashboard/my-tickets"
                className="text-xs text-white hover:underline uppercase focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              >
                View Tickets &rarr;
              </Link>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Membership Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-white to-[#CCCCCC] text-black p-4 md:p-6 border border-white"
      >
        <div className="flex items-start justify-between mb-4 md:mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest mb-1">Member Since</div>
            <div className="font-display font-bold text-lg md:text-2xl">
              {new Date(currentUser.memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </div>
          </div>
          <Shield className="w-8 h-8 md:w-10 md:h-10 opacity-50" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest mb-1">Total Spent</div>
            <div className="font-display font-bold text-2xl md:text-3xl">
              IDR {(stats.totalSpent / 1000000).toFixed(1)}M
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest mb-1">Member Status</div>
            <div className="font-bold uppercase text-base md:text-lg">Active Member</div>
          </div>
        </div>
      </motion.div>
        </>
      )}

    </div>
  );
}
