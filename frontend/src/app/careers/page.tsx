'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/ui/Footer';
import { 
  ArrowRight, Users, Zap, Shield, Heart, Ticket, Globe,
  Briefcase, MapPin, ChevronDown, Rocket, Award
} from 'lucide-react';
import { CAREERS_BENEFITS, CAREERS_CULTURE, OPEN_POSITIONS, DEPARTMENTS, POSITION_TYPE_LABELS } from '@/lib/careers-data';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket: Rocket,
  Ticket,
  Shield,
  Heart,
  Zap,
  Users,
  Globe
};

export default function CareersPage() {
  const [department, setDepartment] = useState('All');

  const filteredPositions = useMemo(() => {
    return department === 'All' 
      ? OPEN_POSITIONS 
      : OPEN_POSITIONS.filter(p => p.department === department);
  }, [department]);

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar links={[
        { href: '/events', label: 'Events' },
        { href: '/lineup', label: 'Lineup' },
        { href: '/help', label: 'Help' },
      ]} />

      {/* Hero */}
      <motion.section
        initial="initial"
        animate="animate"
        variants={pageVariants}
        className="py-16 md:py-24 border-b border-mono-dark-grey text-center"
        aria-labelledby="careers-heading"
      >
        <h1 id="careers-heading" className="font-display font-bold text-4xl sm:text-6xl md:text-8xl uppercase text-white mb-6">
          Build the <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }} aria-hidden="true">Future</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-sm md:text-base max-w-xl mx-auto px-4">
          // JOIN_THE_TEAM_BUILDING_THE_NEXT_GEN_TICKETING_ENGINE
        </p>
      </motion.section>

      {/* Values & Benefits */}
      <section className="py-16 border-b border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="font-display font-bold text-2xl md:text-3xl uppercase text-white mb-12 text-center">Our Culture</h2>
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
          >
            {CAREERS_CULTURE.map((item) => {
              const Icon = ICON_MAP[item.icon] || Shield;
              return (
                <motion.div key={item.title} variants={staggerItem} className="bg-white/5 p-6 border border-mono-dark-grey">
                  <Icon className="w-8 h-8 text-white mb-4" aria-hidden="true" />
                  <h3 className="font-bold uppercase text-white text-sm mb-2">{item.title}</h3>
                  <p className="text-xs text-[#CCCCCC] leading-relaxed">{item.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 border-y border-white bg-black">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="font-display font-bold text-2xl md:text-3xl uppercase text-white mb-12 text-center">Benefits</h2>
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
          >
            {CAREERS_BENEFITS.map((item) => {
              const Icon = ICON_MAP[item.icon] || Ticket;
              return (
                <motion.div key={item.title} variants={staggerItem} className="p-6 border border-mono-dark-grey bg-black flex gap-4 hover:border-white transition-colors">
                  <Icon className="w-8 h-8 shrink-0 text-white" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold uppercase text-sm mb-1 text-white">{item.title}</h3>
                    <p className="text-xs text-[#CCCCCC]">{item.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Job Listings */}
      <section className="py-16 md:py-24" aria-labelledby="jobs-heading">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <div>
              <h2 id="jobs-heading" className="font-display font-bold text-3xl md:text-4xl uppercase text-white mb-2">Open Positions</h2>
              <p className="text-mono-light-grey uppercase tracking-widest text-xs">// FIND_YOUR_NEXT_ROLE</p>
            </div>
            
            <div className="relative w-full md:w-auto">
              <label htmlFor="dept-filter" className="sr-only">Filter by department</label>
              <select
                id="dept-filter"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="appearance-none w-full md:w-auto bg-black border border-white text-white px-4 py-3 md:py-2 pr-8 rounded-none font-mono text-sm uppercase focus:outline-none min-h-touch cursor-pointer"
              >
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
          </div>

          <div className="space-y-4">
            {filteredPositions.length > 0 ? (
              filteredPositions.map((pos) => (
                <motion.div
                  key={pos.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="group bg-black border border-mono-dark-grey hover:border-white p-6 md:p-8 flex flex-col md:flex-row justify-between items-start gap-6 transition-colors"
                >
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] uppercase tracking-widest bg-white text-black px-2 py-0.5">{pos.department}</span>
                      <span className="text-[10px] uppercase tracking-widest border border-mono-dark-grey text-mono-light-grey px-2 py-0.5">{POSITION_TYPE_LABELS[pos.type]}</span>
                    </div>
                    <h3 className="font-display font-bold text-2xl uppercase text-white mb-2 group-hover:text-white transition-colors">{pos.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-mono-light-grey mb-4">
                      <MapPin className="w-3 h-3" aria-hidden="true" /> {pos.location}
                    </div>
                    <p className="text-sm text-[#CCCCCC] max-w-2xl">{pos.description}</p>
                  </div>
                  <Link 
                    href={`/careers/${pos.id}`}
                    className="shrink-0 px-8 py-4 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all flex items-center gap-2 min-h-touch focus-visible:outline-2 focus-visible:outline-white"
                  >
                    View Details <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-20 border border-mono-dark-grey">
                <p className="text-mono-light-grey uppercase tracking-widest">// NO_POSITIONS_IN_THIS_DEPARTMENT</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
