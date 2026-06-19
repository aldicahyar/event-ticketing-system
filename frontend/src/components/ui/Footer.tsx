'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, Shield, CheckCircle, Facebook, Twitter, Instagram, Youtube, Smartphone, CreditCard, Lock } from 'lucide-react';

const FOOTER_LINKS = {
  'Events': [
    { label: 'Upcoming Tours', href: '/events?filter=upcoming' },
    { label: 'Lineup', href: '/lineup' },
    { label: 'Artists', href: '/lineup' },
    { label: 'Venues', href: '/venues' }
  ],
  'Support': [
    { label: 'Help Center', href: '/help' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Refund Policy', href: '/refund' }
  ],
  'Company': [
    { label: 'About Us', href: '/about' },
    { label: 'Careers', href: '/careers' }
  ],
  'Legal': [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'Accessibility', href: '/accessibility' }
  ]
};

const PAYMENT_METHODS = [
  { name: 'Visa', icon: CreditCard },
  { name: 'Mastercard', icon: CreditCard },
  { name: 'BCA', icon: CreditCard },
  { name: 'Mandiri', icon: CreditCard },
  { name: 'BNI', icon: CreditCard },
  { name: 'BRI', icon: CreditCard },
  { name: 'DANA', icon: Smartphone },
  { name: 'GoPay', icon: Smartphone },
  { name: 'OVO', icon: Smartphone }
];

export const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 3000);
      setEmail('');
    }
  };

  return (
    <footer className="bg-black text-white font-mono border-t border-mono-dark-grey" role="contentinfo">
      {/* Newsletter Section */}
      <div className="border-b border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-center">
            <div>
              <h3 className="font-display font-bold text-xl sm:text-2xl uppercase text-white mb-2">
                Stay in the <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Loop</span>
              </h3>
              <p className="text-mono-light-grey uppercase tracking-widest text-xs sm:text-sm">
                // GET EXCLUSIVE ACCESS TO NEW TOURS AND PRE-SALE
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2" aria-label="Newsletter subscription">
              <div className="relative flex-grow">
                <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
                <input
                  id="newsletter-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-black border border-white text-white px-12 py-4 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white focus:border-white/50 placeholder-[#666] min-h-touch"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-6 py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all flex items-center justify-center gap-2 whitespace-nowrap min-h-touch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-live="polite"
              >
                {subscribed ? (
                  <>
                    <CheckCircle className="w-5 h-5" aria-hidden="true" />
                    Subscribed
                  </>
                ) : (
                  <>
                    Subscribe <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Links Section */}
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4" aria-label="EventTicket home">
              <div className="w-6 h-6 bg-white" aria-hidden="true" />
              <span className="text-xl font-display font-bold uppercase tracking-tight">EventTicket.</span>
            </Link>
            <p className="text-xs text-mono-light-grey mb-4">
              Your official gateway to the world&apos;s best concerts and live events.
            </p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-green-500">
                <Shield className="w-4 h-4" aria-hidden="true" />
                SSL Secured
              </span>
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-bold uppercase text-white mb-3 md:mb-4 text-sm">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-[#CCCCCC] hover:text-white transition-colors uppercase tracking-wide py-1 inline-block min-h-0 focus-visible:outline-2 focus-visible:outline-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods & Social */}
      <div className="border-t border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6 py-6">
          <div className="flex flex-col md:flex-row gap-6 justify-between items-center">

            {/* Payment Methods */}
            <div className="order-2 md:order-1">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-mono-light-grey" aria-hidden="true" />
                <span className="text-xs text-mono-light-grey uppercase">Secure Payment Methods</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <div
                    key={method.name}
                    className="px-2 py-1 bg-white/10 border border-mono-dark-grey text-[#CCCCCC] text-[10px] font-bold uppercase hover:bg-white hover:text-black transition-colors"
                    title={method.name}
                  >
                    {method.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Social Media */}
            <div className="order-1 md:order-2 flex flex-col md:items-end gap-3">
              <span className="text-xs text-mono-light-grey uppercase">Follow Us</span>
              <div className="flex gap-2">
                {[
                  { icon: Facebook, label: 'Facebook' },
                  { icon: Twitter, label: 'Twitter' },
                  { icon: Instagram, label: 'Instagram' },
                  { icon: Youtube, label: 'YouTube' }
                ].map((social) => (
                  <a
                    key={social.label}
                    href={`#${social.label.toLowerCase()}`}
                    className="w-11 h-11 border border-mono-dark-grey flex items-center justify-center text-[#CCCCCC] hover:bg-white hover:text-black hover:border-white transition-all focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                    aria-label={social.label}
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 justify-between items-center text-xs text-mono-light-grey">
            <p>&copy; 2024 EventTicket. All rights reserved.</p>
            <p>Made with precision for metalheads worldwide.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
