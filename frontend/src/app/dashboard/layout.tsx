'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  User, Ticket, LogOut, 
  CreditCard, Bell, Calendar, Shield, TrendingUp,
  Layers, Percent
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [currentUser, setCurrentUser] = useState({
    firstName: 'User',
    lastName: '',
    role: 'ATTENDEE'
  });

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
      } else {
        const storedUser = apiClient.getUser();
        if (storedUser) {
          const nameParts = storedUser.name.split(' ');
          setCurrentUser({
            firstName: nameParts[0] || 'User',
            lastName: nameParts.slice(1).join(' ') || '',
            role: storedUser.role
          });
        }
      }
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const baseLinks = [
    { href: '/dashboard', label: 'Overview', icon: TrendingUp },
    { href: '/dashboard/orders', label: 'Orders', icon: CreditCard },
    { href: '/dashboard/my-tickets', label: 'My Tickets', icon: Ticket },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
  ];

  // Menampilkan menu kelola event dan venue hanya jika role-nya ADMIN atau ORGANIZER
  const isAdminOrOrganizer = currentUser.role === 'ADMIN' || currentUser.role === 'ORGANIZER';
  const isAdmin = currentUser.role === 'ADMIN';
  
  const links = [
    ...baseLinks,
    ...(isAdminOrOrganizer ? [
      { href: '/dashboard/events', label: 'Manage Events', icon: Calendar },
      { href: '/dashboard/venues', label: 'Manage Venues', icon: Shield }
    ] : []),
    ...(isAdmin ? [
      { href: '/dashboard/tier-settings', label: 'Tier Settings', icon: Layers },
      { href: '/dashboard/tax-settings', label: 'Tax Settings', icon: Percent }
    ] : []),
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-xl uppercase animate-pulse">Loading...</div>
      </div>
    );
  }

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
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold uppercase leading-none">
                  {currentUser.firstName} {currentUser.lastName}
                </span>
                <span className="text-[9px] text-[#888] font-bold uppercase tracking-wider mt-1">
                  Role: {currentUser.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          
          {/* Sidebar - scroll horizontal pada mobile, vertikal pada desktop */}
          <div className="lg:col-span-1">
            {/* Mobile: horizontal tabs */}
            <div className="flex lg:hidden overflow-x-auto gap-2 mb-6 -mx-4 px-4 scrollbar-none">
              {links.map((link) => {
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

            {/* Desktop: sticky sidebar (tersembunyi di mobile) */}
            <div className="hidden lg:block">
              <div className="bg-black border border-mono-dark-grey p-4 sticky top-24">
                <nav className="space-y-1" aria-label="Dashboard sidebar">
                  {links.map((link) => {
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

          {/* Konten Utama */}
          <div className="lg:col-span-3">
            {children}
          </div>

        </div>
      </div>
    </div>
  );
}
