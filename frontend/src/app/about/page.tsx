'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/ui/Footer';
import {
  Users, Calendar, Ticket, Shield,
  Zap, Heart, ArrowRight, Mail, Award, TrendingUp
} from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

const STATS = [
  { label: 'Tickets Sold', value: '50K+', icon: Ticket },
  { label: 'Live Events', value: '200+', icon: Calendar },
  { label: 'Member Growth', value: '120%', icon: TrendingUp },
  { label: 'Satisfaction', value: '99.9%', icon: Heart },
];

const VALUES = [
  {
    icon: Zap,
    title: 'Precision',
    description: 'We build systems with industrial-grade reliability and high-speed execution.'
  },
  {
    icon: Shield,
    title: 'Security',
    description: 'Your data and transactions are protected by bank-level encryption protocols.'
  },
  {
    icon: Users,
    title: 'Community',
    description: 'We connect fans and artists, building a vibrant ecosystem for live music.'
  },
  {
    icon: Award,
    title: 'Integrity',
    description: 'Transparency in every transaction. No hidden fees, no fake tickets.'
  }
];

const PARTNERS = [
  { name: 'SPOTIFY', url: '/logos/spotify.svg' },
  { name: 'SOUNDCLOUD', url: '/logos/soundcloud.svg' },
  { name: 'BANDSINTOWN', url: '/logos/bandsintown.svg' },
  { name: 'TICKETMASTER', url: '/logos/ticketmaster.svg' },
  { name: 'LIVE NATION', url: '/logos/livenation.svg' },
  { name: 'EVENTBRITE', url: '/logos/eventbrite.svg' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar links={[
        { href: '/events', label: 'Events' },
        { href: '/venues', label: 'Venues' },
        { href: '/lineup', label: 'Lineup' },
        { href: '/help', label: 'Help' },
      ]} />

      {/* Hero Header */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
        className="border-b border-mono-dark-grey py-16 md:py-24 overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <h1 className="font-display font-bold text-4xl sm:text-6xl md:text-8xl uppercase text-white mb-6">
            About <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }} aria-hidden="true">Us</span>
          </h1>
          <p className="text-mono-light-grey uppercase tracking-widest text-sm sm:text-lg mb-8 max-w-2xl mx-auto">
            {"// THE_STORY_BEHIND_EVENTTICKET"}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-white text-black px-4 py-1 text-xs font-bold uppercase tracking-widest">EST. 2024</div>
            <div className="border border-white text-white px-4 py-1 text-xs font-bold uppercase tracking-widest">JAKARTA, ID</div>
          </div>
        </div>
      </motion.section>

      {/* Story Section */}
      <section className="py-16 md:py-24 border-b border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative aspect-square md:aspect-video lg:aspect-square overflow-hidden border border-mono-dark-grey"
            >
              <img
                src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop"
                alt="Event concert crowd"
                className="w-full h-full object-cover grayscale contrast-125"
              />
              <div className="absolute inset-0 bg-black/20 mix-blend-overlay" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="font-display font-bold text-3xl md:text-4xl uppercase text-white">Our Mission</h2>
              <p className="text-mono-light-grey leading-relaxed text-sm md:text-base">
                EventTicket was founded with a singular purpose: to bridge the gap between artists and their most dedicated fans through high-performance ticketing technology. We believe the experience of live music starts the moment you secure your spot.
              </p>
              <p className="text-mono-light-grey leading-relaxed text-sm md:text-base">
                Born in the heart of Jakarta, we&apos;ve grown from a small collective of tech enthusiasts and metalheads into Indonesia&apos;s most reliable platform for high-demand concert tours and festivals.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div>
                  <h3 className="font-bold uppercase text-white text-sm mb-2 underline underline-offset-4">The Vision</h3>
                  <p className="text-xs text-[#999] leading-relaxed">Global scalability for local event organizers, powered by industrial-grade security.</p>
                </div>
                <div>
                  <h3 className="font-bold uppercase text-white text-sm mb-2 underline underline-offset-4">The Passion</h3>
                  <p className="text-xs text-[#999] leading-relaxed">We don&apos;t just sell tickets. We provide the entry-point to unforgettable auditory experiences.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-20 bg-black border-y border-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center space-y-2">
                <stat.icon className="w-6 h-6 mx-auto mb-4 text-white" aria-hidden="true" />
                <div className="text-3xl md:text-5xl font-display font-bold uppercase tracking-tighter text-white">{stat.value}</div>
                <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-mono-light-grey">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-12 md:py-16 border-b border-mono-dark-grey overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <p className="text-center text-[10px] text-mono-light-grey uppercase tracking-[0.4em] mb-12">
            {"// TRUSTED_BY_INDUSTRY_LEADERS"}
          </p>
        </div>

        {/* Marquee Container */}
        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

          {/* Scrolling logos — CSS animation for smooth infinite loop */}
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused] py-4">
            {/* First Set */}
            <div className="flex gap-16 md:gap-24 items-center pr-16 md:pr-24 shrink-0">
              {PARTNERS.map((partner, i) => (
                <div
                  key={`${partner.name}-1-${i}`}
                  className="flex flex-col items-center gap-4 shrink-0 group cursor-default"
                >
                  <div className="h-12 md:h-16 flex items-center justify-center grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-110">
                    <img
                      src={partner.url}
                      alt={partner.name}
                      className="h-full w-auto object-contain"
                      loading="lazy"
                    />
                  </div>
                  <span className="font-bold text-[8px] md:text-[9px] uppercase tracking-[0.3em] text-mono-dark-grey group-hover:text-white transition-colors opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    {partner.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Second Set */}
            <div className="flex gap-16 md:gap-24 items-center pr-16 md:pr-24 shrink-0" aria-hidden="true">
              {PARTNERS.map((partner, i) => (
                <div
                  key={`${partner.name}-2-${i}`}
                  className="flex flex-col items-center gap-4 shrink-0 group cursor-default"
                >
                  <div className="h-12 md:h-16 flex items-center justify-center grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-110">
                    <img
                      src={partner.url}
                      alt={partner.name}
                      className="h-full w-auto object-contain"
                      loading="lazy"
                    />
                  </div>
                  <span className="font-bold text-[8px] md:text-[9px] uppercase tracking-[0.3em] text-mono-dark-grey group-hover:text-white transition-colors opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    {partner.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24 border-b border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6 text-center mb-16">
          <h2 className="font-display font-bold text-3xl md:text-4xl uppercase text-white mb-4">Core Values</h2>
          <p className="text-xs text-mono-light-grey uppercase tracking-widest">{"// THE_FOUNDATION_OF_OUR_SYSTEM"}</p>
        </div>
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
          >
            {VALUES.map((value) => (
              <motion.div
                key={value.title}
                variants={staggerItem}
                className="p-6 border border-mono-dark-grey hover:border-white transition-colors duration-300 group"
              >
                <value.icon className="w-8 h-8 text-white mb-6 group-hover:scale-110 transition-transform" aria-hidden="true" />
                <h3 className="font-bold uppercase text-white text-sm mb-3">{value.title}</h3>
                <p className="text-xs text-mono-light-grey leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 border-t border-mono-dark-grey bg-gradient-to-t from-white/5 to-transparent">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="font-display font-bold text-3xl md:text-5xl uppercase text-white mb-6">
            Join the <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Community</span>
          </h2>
          <p className="text-mono-light-grey uppercase tracking-widest text-xs sm:text-sm mb-12 max-w-md mx-auto">
            Experience the next generation of event ticketing. Secure, fast, and built for fans.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/events"
              className="px-10 py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 flex items-center justify-center gap-3 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              Browse Events <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
            <Link
              href="/contact"
              className="px-10 py-4 bg-transparent border-2 border-mono-dark-grey text-white font-bold uppercase tracking-wide hover:border-white transition-all duration-300 flex items-center justify-center gap-3 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              Contact Us <Mail className="w-5 h-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
