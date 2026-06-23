'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BrutalistHero } from '@/components/hero/BrutalistHero';
import { EventList } from '@/components/events/EventList';
import { Footer } from '@/components/ui/Footer';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const navLinks = isAuthenticated
    ? [
        { href: '/events', label: 'Events' },
        { href: '/venues', label: 'Venues' },
        { href: '/lineup', label: 'Lineup' },
        { href: '/dashboard', label: 'Dashboard' },
      ]
    : [
        { href: '/events', label: 'Events' },
        { href: '/venues', label: 'Venues' },
        { href: '/lineup', label: 'Lineup' },
        { href: '/auth/login', label: 'Login' },
        { href: '/auth/register', label: 'Sign Up' },
      ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-mono">
      {/* Navbar */}
      <nav
        className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 h-16 bg-transparent pointer-events-none"
        role="navigation"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white uppercase select-none pointer-events-auto flex items-center gap-1"
          aria-label="EventTicket home"
        >
          <div className="w-4 h-4 bg-white" aria-hidden="true" />
          EventTicket.
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0 pointer-events-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="h-16 px-5 flex items-center text-sm font-semibold uppercase text-white hover:text-white relative group transition-colors focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" aria-hidden="true" />
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden pointer-events-auto flex items-center justify-center w-11 h-11"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center gap-6 md:hidden"
          role="dialog"
          aria-label="Mobile navigation menu"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-3xl font-display font-bold uppercase text-white hover:text-mono-light-grey transition-colors py-3 px-6 min-h-touch flex items-center focus-visible:outline-2 focus-visible:outline-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <div id="main-content">
        <BrutalistHero />
        <EventList />
        <Footer />
      </div>
    </div>
  );
}
