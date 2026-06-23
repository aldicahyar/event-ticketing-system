'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  User, Ticket, Settings, LogOut, 
  ArrowRight, Calendar, CreditCard, Bell,
  Shield, TrendingUp, Users
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

// Default user data (fallback)
const DEFAULT_USER = {
  firstName: 'Guest',
  lastName: '',
  email: '',
  memberSince: new Date().toISOString(),
  totalOrders: 0,
  totalSpent: 0,
  loyaltyPoints: 0
};

const RECENT_ORDERS = [
  {
    id: 'ORD-2024-001',
    event: 'BRING ME THE HORIZON',
    date: '2026-03-15',
    venue: 'Jakarta GBK Stadium',
    tickets: 2,
    total: 1500000,
    status: 'upcoming'
  },
  {
    id: 'ORD-2024-002',
    event: 'BAD OMENS',
    date: '2025-05-20',
    venue: 'Jakarta ICE BSD',
    tickets: 1,
    total: 650000,
    status: 'upcoming'
  },
  {
    id: 'ORD-2024-003',
    event: 'NORTHLANE',
    date: '2024-11-20',
    venue: 'Surabaya Grand City',
    tickets: 3,
    total: 1350000,
    status: 'completed'
  }
];

const DASHBOARD_LINKS = [
  { href: '/dashboard', label: 'Overview', icon: TrendingUp },
  { href: '/dashboard/orders', label: 'Orders', icon: CreditCard },
  { href: '/dashboard/my-tickets', label: 'My Tickets', icon: Ticket },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [currentUser, setCurrentUser] = useState(DEFAULT_USER);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
      } else if (user && !user.emailVerified) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(user.email)}`);
      }
    }
  }, [user, isAuthenticated, isLoading, router]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    // Load real user from localStorage
    const storedUser = apiClient.getUser();
    if (storedUser) {
      const nameParts = (storedUser.name || '').split(' ');
      setCurrentUser({
        firstName: nameParts[0] || 'User',
        lastName: nameParts.slice(1).join(' ') || '',
        email: storedUser.email || '',
        memberSince: new Date().toISOString(),
        totalOrders: 0,
        totalSpent: 0,
        loyaltyPoints: 0
      });
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-mono-dark-grey" role="navigation" aria-label="Dashboard navigation">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="EventTicket home">
            <div className="w-4 h-4 bg-white" aria-hidden="true" />
            <span className="text-xl font-display font-bold uppercase">EventTicket.</span>
          </Link>
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-white/10 transition-colors min-h-touch min-w-touch flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2" aria-label="Notifications">
              <Bell className="w-5 h-5" aria-hidden="true" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center" aria-hidden="true">
                <User className="w-4 h-4 text-black" />
              </div>
              <span className="text-sm font-bold uppercase hidden md:block">
                {currentUser.firstName} {currentUser.lastName}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          
          {/* Sidebar - horizontal scroll on mobile, vertical on desktop */}
          <div className="lg:col-span-1">
            {/* Mobile: horizontal tabs */}
            <div className="flex lg:hidden overflow-x-auto gap-2 mb-6 -mx-4 px-4 scrollbar-none">
              {DASHBOARD_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`whitespace-nowrap min-h-touch px-4 py-3 transition-all flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
                      isActive 
                        ? 'bg-white text-black' 
                        : 'text-[#CCCCCC] hover:bg-white/10 hover:text-white border border-mono-dark-grey lg:border-0'
                    }`}
                  >
                    <link.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span className="font-bold uppercase text-sm">{link.label}</span>
                  </Link>
                );
              })}
              <button onClick={handleLogout} className="whitespace-nowrap min-h-touch px-4 py-3 text-red-500 hover:bg-red-600/10 transition-all flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 border border-mono-dark-grey lg:border-0">
                <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span className="font-bold uppercase text-sm">Sign Out</span>
              </button>
            </div>

            {/* Desktop: sticky sidebar (hidden on mobile, shown on lg+) */}
            <div className="hidden lg:block">
              <div className="bg-black border border-mono-dark-grey p-4 sticky top-24">
                <nav className="space-y-1" aria-label="Dashboard sidebar">
                  {DASHBOARD_LINKS.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={`sidebar-${link.href}`}
                        href={link.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex items-center gap-3 px-4 py-3 transition-all focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
                          isActive 
                            ? 'bg-white text-black' 
                            : 'text-[#CCCCCC] hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <link.icon className="w-5 h-5" aria-hidden="true" />
                        <span className="font-bold uppercase text-sm">{link.label}</span>
                      </Link>
                    );
                  })}
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-600/10 transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2" aria-label="Sign out of your account">
                    <LogOut className="w-5 h-5" aria-hidden="true" />
                    <span className="font-bold uppercase text-sm">Sign Out</span>
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6 md:space-y-8">
            
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

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {[
                { label: 'Total Orders', value: currentUser.totalOrders, icon: CreditCard },
                { label: 'Tickets Bought', value: '0', icon: Ticket },
                { label: 'Loyalty Points', value: currentUser.loyaltyPoints.toLocaleString(), icon: Users },
                { label: 'Total Spent', value: `IDR ${(currentUser.totalSpent / 1000000).toFixed(1)}M`, icon: TrendingUp }
              ].map((stat, index) => (
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
                <Link href="/dashboard/orders" className="text-xs text-white hover:underline uppercase focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
                  View All
                </Link>
              </div>
              <div className="divide-y divide-mono-dark-grey">
                {RECENT_ORDERS.slice(0, 3).map((order) => (
                  <div key={order.id} className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white/5 transition-colors gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 flex items-center justify-center shrink-0" aria-hidden="true">
                        <Ticket className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold uppercase text-white text-sm md:text-base truncate">{order.event}</div>
                        <div className="text-xs text-mono-light-grey">
                          {order.id} &middot; {new Date(order.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                      <div className="text-left sm:text-right">
                        <div className="font-bold text-white text-sm">IDR {order.total.toLocaleString()}</div>
                        <div className="text-xs text-mono-light-grey">
                          {order.tickets} ticket{order.tickets > 1 ? 's' : ''}
                        </div>
                      </div>
                      <Link 
                        href={`/dashboard/my-tickets/${order.id}`}
                        className="p-2 border border-mono-dark-grey hover:border-white transition-colors min-h-touch min-w-touch flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                        aria-label={`View order ${order.id}`}
                      >
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
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
                {RECENT_ORDERS.filter(o => o.status === 'upcoming').map((order) => (
                  <div key={order.id} className="bg-white/5 p-3 md:p-4 border border-mono-dark-grey">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 mr-2">
                        <div className="font-display font-bold uppercase text-white text-sm md:text-base mb-1 truncate">
                          {order.event}
                        </div>
                        <div className="text-xs text-mono-light-grey">
                          {order.venue}
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-white text-black text-xs font-bold uppercase shrink-0">
                        Upcoming
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-[#CCCCCC] mb-3">
                      <Calendar className="w-3 h-3 md:w-4 md:h-4 shrink-0" aria-hidden="true" />
                      {new Date(order.date).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </div>
                    <Link 
                      href={`/events/${order.id}`}
                      className="text-xs text-white hover:underline uppercase focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                    >
                      View Event Details &rarr;
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
                  <div className="text-xs uppercase tracking-widest mb-1">Loyalty Points</div>
                  <div className="font-display font-bold text-2xl md:text-3xl">{currentUser.loyaltyPoints.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-widest mb-1">Member Status</div>
                  <div className="font-bold uppercase text-base md:text-lg">Gold Member</div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
