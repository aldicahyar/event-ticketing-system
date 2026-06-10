'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  User, Ticket, Clock, Settings, LogOut, 
  ArrowRight, Calendar, CreditCard, Bell,
  ChevronRight, Shield, TrendingUp, Users
} from 'lucide-react';

// Mock user data
const USER = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  memberSince: '2024-03-15',
  totalOrders: 12,
  totalSpent: 8750000,
  loyaltyPoints: 2450
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
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

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
              <span className="text-sm font-bold uppercase hidden md:block">
                {USER.firstName} {USER.lastName}
              </span>
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
          <div className="lg:col-span-3 space-y-8">
            
            {/* Greeting */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="font-display font-bold text-4xl uppercase text-white mb-2">
                {greeting}, <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>
                  {USER.firstName}
                </span>
              </h1>
              <p className="text-mono-light-grey uppercase tracking-widest text-sm">
                // WELCOME_BACK
              </p>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Orders', value: USER.totalOrders, icon: CreditCard },
                { label: 'Tickets Bought', value: '24', icon: Ticket },
                { label: 'Loyalty Points', value: USER.loyaltyPoints.toLocaleString(), icon: Users },
                { label: 'Total Spent', value: `IDR ${(USER.totalSpent / 1000000).toFixed(1)}M`, icon: TrendingUp }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-black border border-mono-dark-grey p-4 hover:border-white transition-colors"
                >
                  <stat.icon className="w-6 h-6 text-white mb-3" />
                  <div className="text-2xl font-display font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs text-mono-light-grey uppercase tracking-widest">
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
              <div className="p-4 border-b border-mono-dark-grey flex items-center justify-between">
                <h2 className="font-display font-bold text-xl uppercase text-white">
                  Recent Orders
                </h2>
                <Link href="/dashboard/orders" className="text-xs text-white hover:underline uppercase">
                  View All
                </Link>
              </div>
              <div className="divide-y divide-mono-dark-grey">
                {RECENT_ORDERS.slice(0, 3).map((order) => (
                  <div key={order.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 flex items-center justify-center">
                        <Ticket className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-bold uppercase text-white">{order.event}</div>
                        <div className="text-xs text-mono-light-grey">
                          {order.id} • {new Date(order.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-white">IDR {order.total.toLocaleString()}</div>
                        <div className="text-xs text-mono-light-grey">
                          {order.tickets} ticket{order.tickets > 1 ? 's' : ''}
                        </div>
                      </div>
                      <Link 
                        href={`/dashboard/my-tickets/${order.id}`}
                        className="p-2 border border-mono-dark-grey hover:border-white transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
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
              <div className="p-4 border-b border-mono-dark-grey">
                <h2 className="font-display font-bold text-xl uppercase text-white">
                  Upcoming Events
                </h2>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {RECENT_ORDERS.filter(o => o.status === 'upcoming').map((order) => (
                  <div key={order.id} className="bg-white/5 p-4 border border-mono-dark-grey">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-display font-bold uppercase text-white mb-1">
                          {order.event}
                        </div>
                        <div className="text-xs text-mono-light-grey">
                          {order.venue}
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-white text-black text-xs font-bold uppercase">
                        Upcoming
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#CCCCCC] mb-3">
                      <Calendar className="w-4 h-4" />
                      {new Date(order.date).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </div>
                    <Link 
                      href={`/events/${order.id}`}
                      className="text-xs text-white hover:underline uppercase"
                    >
                      View Event Details →
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
              className="bg-gradient-to-br from-white to-[#CCCCCC] text-black p-6 border border-white"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-xs uppercase tracking-widest mb-1">Member Since</div>
                  <div className="font-display font-bold text-2xl">
                    {new Date(USER.memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <Shield className="w-10 h-10 opacity-50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-widest mb-1">Loyalty Points</div>
                  <div className="font-display font-bold text-3xl">{USER.loyaltyPoints.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-widest mb-1">Member Status</div>
                  <div className="font-bold uppercase text-lg">Gold Member</div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </main>
  );
}
