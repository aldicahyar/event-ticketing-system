'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  active?: boolean;
}

interface NavbarProps {
  links: NavLink[];
  showAuth?: boolean;
}

export const Navbar = ({ links, showAuth = true }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allLinks = showAuth
    ? [...links, { href: '/auth/login', label: 'Login' }]
    : links;

  return (
    <>
      <nav
        className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-mono-dark-grey"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="EventTicket home">
            <div className="w-4 h-4 bg-white" aria-hidden="true" />
            <span className="text-xl font-display font-bold uppercase">EventTicket.</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {allLinks.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className={`text-sm font-semibold uppercase transition-colors py-2 px-1 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${
                  link.active
                    ? 'text-white'
                    : 'text-[#CCCCCC] hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-11 h-11 focus-visible:outline-2 focus-visible:outline-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="page-mobile-menu"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          id="page-mobile-menu"
          className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center gap-6 md:hidden"
          role="dialog"
          aria-label="Mobile navigation menu"
        >
          {allLinks.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              className="text-2xl font-display font-bold uppercase text-white hover:text-mono-light-grey transition-colors py-3 px-6 min-h-touch flex items-center focus-visible:outline-2 focus-visible:outline-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
};
