'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/ui/Footer';
import {
  Mail, MapPin, Clock, Phone, Send,
  Facebook, Twitter, Instagram, Youtube,
  CheckCircle, User, Loader2
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

const CONTACT_CARDS = [
  {
    icon: Mail,
    title: 'Email Us',
    description: 'General inquiries and partnerships',
    value: 'hello@eventticket.com',
    href: 'mailto:hello@eventticket.com',
    linkLabel: 'Send Email',
  },
  {
    icon: Phone,
    title: 'Call Us',
    description: 'Mon-Fri, 9AM-6PM WIB',
    value: '+62 21 1234 5678',
    href: 'tel:+622112345678',
    linkLabel: 'Call Now',
  },
  {
    icon: MapPin,
    title: 'Visit Us',
    description: 'EventTicket HQ',
    value: 'Jakarta, Indonesia',
    href: '#',
    linkLabel: 'Get Directions',
  },
  {
    icon: Clock,
    title: 'Business Hours',
    description: 'Monday - Friday',
    value: '9:00 AM - 6:00 PM WIB',
    href: undefined,
    linkLabel: undefined,
  },
];

const SOCIAL_LINKS = [
  { icon: Facebook, label: 'Facebook', href: '#' },
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
];

export default function ContactPage() {
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setFormStatus('submitting');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setFormStatus('success');
  };

  const handleReset = () => {
    setFormData({ name: '', email: '', subject: '', message: '' });
    setFormStatus('idle');
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar links={[{ href: '/events', label: 'Events' }, { href: '/venues', label: 'Venues' }, { href: '/lineup', label: 'Lineup' }, { href: '/help', label: 'Help' }]} />

      {/* Hero Header */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
        className="border-b border-mono-dark-grey py-12 md:py-16"
        aria-labelledby="contact-hero-heading"
      >
        <div className="container mx-auto px-4 md:px-6">
          <h1 id="contact-hero-heading" className="font-display font-bold text-3xl sm:text-4xl md:text-5xl uppercase text-white mb-2">
            Get in <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }} aria-hidden="true">Touch</span>
          </h1>
          <p className="text-mono-light-grey uppercase tracking-widest text-xs sm:text-sm">
            // WE_Would_LOVE_TO_HEAR_FROM_YOU
          </p>
        </div>
      </motion.section>

      {/* Contact Cards */}
      <section className="py-12 md:py-16" aria-label="Contact information">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {CONTACT_CARDS.map((card) => (
              <motion.div
                key={card.title}
                variants={staggerItem}
                className="bg-black border border-mono-dark-grey p-4 md:p-6 hover:border-white transition-colors duration-300"
              >
                <card.icon className="w-6 h-6 text-white mb-4" aria-hidden="true" />
                <h2 className="font-bold uppercase text-white text-sm mb-1">{card.title}</h2>
                <p className="text-xs text-mono-light-grey mb-3">{card.description}</p>
                <p className="text-sm text-white font-semibold mb-3">{card.value}</p>
                {card.href && card.linkLabel && (
                  <a
                    href={card.href}
                    className="text-xs text-white hover:underline uppercase flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-white"
                  >
                    {card.linkLabel} <Send className="w-3 h-3" aria-hidden="true" />
                  </a>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Contact Form + Social */}
      <section className="py-12 md:py-16 border-t border-mono-dark-grey" aria-labelledby="contact-form-heading">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Form */}
            <div className="lg:col-span-2">
              <h2 id="contact-form-heading" className="font-display font-bold text-xl sm:text-2xl uppercase text-white mb-6">
                Send Us a Message
              </h2>

              {formStatus === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-black border border-green-500/50 p-6 md:p-8 text-center"
                >
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" aria-hidden="true" />
                  <h3 className="font-display font-bold text-2xl uppercase text-white mb-2">Message Sent!</h3>
                  <p className="text-mono-light-grey text-sm mb-6">
                    Thank you for reaching out. We&apos;ll get back to you soon.
                  </p>
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-black border border-mono-dark-grey p-6 md:p-8 space-y-5" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        autoComplete="name"
                        required
                        className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white transition-colors placeholder-[#666] min-h-touch"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                        autoComplete="email"
                        required
                        className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white transition-colors placeholder-[#666] min-h-touch"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-subject" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                      Subject
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      autoComplete="off"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="What's this about?"
                      className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white transition-colors placeholder-[#666] min-h-touch"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us how we can help..."
                      rows={5}
                      required
                      className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white transition-colors placeholder-[#666] resize-y min-h-[120px]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={formStatus === 'submitting'}
                    className="w-full py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    {formStatus === 'submitting' ? (
                      <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />Sending...</>
                    ) : (
                      <><Send className="w-5 h-5" aria-hidden="true" />Send Message</>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Sidebar: Social + Ticket */}
            <div className="lg:col-span-1 space-y-6">
              {/* Support Ticket CTA */}
              <div className="bg-black border border-mono-dark-grey p-6">
                <h3 className="font-bold uppercase text-white text-sm mb-2">Need Technical Help?</h3>
                <p className="text-xs text-[#CCCCCC] mb-4">
                  For booking issues, payment problems, or account support, submit a ticket for faster resolution.
                </p>
                <Link
                  href="/help/contact"
                  className="inline-flex items-center gap-2 px-4 py-3 bg-white text-black font-bold uppercase text-xs tracking-wide hover:bg-transparent hover:text-white hover:border-white border-2 border-white transition-all focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  Submit Ticket <Send className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>

              {/* Social Media */}
              <div className="bg-black border border-mono-dark-grey p-6">
                <h3 className="font-bold uppercase text-white text-sm mb-4">Follow Us</h3>
                <div className="flex flex-wrap gap-3">
                  {SOCIAL_LINKS.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      className="w-11 h-11 border border-mono-dark-grey flex items-center justify-center text-[#CCCCCC] hover:bg-white hover:text-black hover:border-white transition-all focus-visible:outline-2 focus-visible:outline-white"
                      aria-label={social.label}
                    >
                      <social.icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Help Center CTA */}
              <div className="bg-black border border-mono-dark-grey p-6">
                <h3 className="font-bold uppercase text-white text-sm mb-2">Browse Help Center</h3>
                <p className="text-xs text-[#CCCCCC] mb-4">
                  Find answers to common questions in our knowledge base.
                </p>
                <Link
                  href="/help"
                  className="text-xs text-white hover:underline uppercase flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-white"
                >
                  Visit Help Center <User className="w-3 h-3" aria-hidden="true" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
