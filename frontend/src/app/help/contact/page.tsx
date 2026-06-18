'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/ui/Footer';
import {
  Mail, Clock, Shield, CheckCircle, AlertCircle,
  Send, Upload, X, FileText, ArrowRight, ArrowLeft,
  ChevronDown, ChevronRight, Loader2, User
} from 'lucide-react';

const TICKET_CATEGORIES = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'booking', label: 'Booking Issue' },
  { value: 'payment', label: 'Payment Problem' },
  { value: 'account', label: 'Account Issue' },
  { value: 'cancellation', label: 'Event Cancellation' },
  { value: 'refund', label: 'Refund Request' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-green-500' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
  { value: 'high', label: 'High', color: 'text-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-500' },
];

const rowVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' as const } },
};

const fieldVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, x: -8 },
};

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' as const } },
};

interface FormData {
  subject: string;
  category: string;
  priority: string;
  fullName: string;
  email: string;
  orderNumber: string;
  message: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function HelpContactPage() {
  const [formData, setFormData] = useState<FormData>({
    subject: '',
    category: '',
    priority: 'medium',
    fullName: '',
    email: '',
    orderNumber: '',
    message: '',
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [ticketStatus, setTicketStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [ticketNumber, setTicketNumber] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.category) newErrors.category = 'Please select a category';
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    else if (formData.message.trim().length < 20) newErrors.message = 'Message must be at least 20 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setTicketStatus('submitting');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const number = 'TKT-' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).substring(2, 5).toUpperCase();
    setTicketNumber(number);
    setTicketStatus('success');
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, attachment: 'File size must be under 5MB' }));
      return;
    }
    setAttachment(file || null);
    if (errors.attachment) {
      setErrors(prev => {
        const n = { ...prev };
        delete n.attachment;
        return n;
      });
    }
  };

  const handleReset = () => {
    setFormData({ subject: '', category: '', priority: 'medium', fullName: '', email: '', orderNumber: '', message: '' });
    setAttachment(null);
    setTicketStatus('idle');
    setTicketNumber('');
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar links={[
        { href: '/events', label: 'Events' },
        { href: '/lineup', label: 'Lineup' },
        { href: '/help', label: 'Help', active: true },
      ]} />

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
        className="border-b border-mono-dark-grey py-12 md:py-16"
        aria-labelledby="help-contact-heading"
      >
        <div className="container mx-auto px-4 md:px-6">
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-2 text-xs text-mono-light-grey">
              <li>
                <Link href="/help" className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white">Help Center</Link>
              </li>
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
              <li className="text-white" aria-current="page">Submit a Ticket</li>
            </ol>
          </nav>

          <h1 id="help-contact-heading" className="font-display font-bold text-3xl sm:text-4xl md:text-5xl uppercase text-white mb-2">
            Support <span className="text-transparent stroke-text" style={{ WebkitTextStroke: '2px white' }} aria-hidden="true">Ticket</span>
          </h1>
          <p className="text-mono-light-grey uppercase tracking-widest text-xs sm:text-sm mb-2">// SUBMIT_A_TICKET</p>
          <p className="text-[#CCCCCC] text-sm">Can&apos;t find what you need? Submit a ticket and we&apos;ll respond within 24 hours.</p>
        </div>
      </motion.section>

      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1" aria-label="Support information">
            <div className="sticky top-24 bg-black border border-mono-dark-grey p-4 md:p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-white" aria-hidden="true" />
                  <h2 className="font-bold uppercase text-white text-sm">Response Time</h2>
                </div>
                <div className="space-y-2">
                  {[
                    { priority: 'Low', time: '48 hours', color: 'bg-green-500' },
                    { priority: 'Medium', time: '24 hours', color: 'bg-yellow-500' },
                    { priority: 'High', time: '12 hours', color: 'bg-orange-500' },
                    { priority: 'Urgent', time: '4 hours', color: 'bg-red-500' },
                  ].map((item) => (
                    <div key={item.priority} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-[#CCCCCC]">
                        <span className={`w-2 h-2 ${item.color}`} aria-hidden="true" />
                        {item.priority}
                      </span>
                      <span className="text-white font-bold">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-mono-dark-grey">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-5 h-5 text-white" aria-hidden="true" />
                  <h2 className="font-bold uppercase text-white text-sm">Direct Email</h2>
                </div>
                <a href="mailto:support@eventticket.com" className="text-xs text-[#CCCCCC] hover:text-white transition-colors break-all focus-visible:outline-2 focus-visible:outline-white">support@eventticket.com</a>
              </div>

              <div className="pt-4 border-t border-mono-dark-grey">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-white" aria-hidden="true" />
                  <h2 className="font-bold uppercase text-white text-sm">Track Your Ticket</h2>
                </div>
                <Link href="/dashboard/orders" className="text-xs text-white hover:underline uppercase flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-white">Go to Dashboard <ArrowRight className="w-3 h-3" aria-hidden="true" /></Link>
              </div>

              <div className="pt-4 border-t border-mono-dark-grey">
                <Link href="/contact" className="text-xs text-[#CCCCCC] hover:text-white transition-colors flex items-center gap-2 py-2 focus-visible:outline-2 focus-visible:outline-white">
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  General Contact (non-ticket)
                </Link>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {ticketStatus === 'success' ? (
                <motion.div key="success" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <div className="bg-black border border-green-500/50 p-6 md:p-8 text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }} className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-black" aria-hidden="true" />
                    </motion.div>
                    <h2 className="font-display font-bold text-2xl sm:text-3xl uppercase text-white mb-2">Ticket Submitted!</h2>
                    <p className="text-mono-light-grey uppercase tracking-widest text-sm mb-6">// YOUR_REQUEST_HAS_BEEN_RECEIVED</p>
                    <div className="bg-white/5 p-6 mb-6 inline-block">
                      <div className="text-xs text-mono-light-grey uppercase tracking-widest mb-1">Ticket Number</div>
                      <div className="text-2xl font-display font-bold text-white tracking-widest">{ticketNumber}</div>
                    </div>
                    <div className="bg-white/5 p-4 mb-6 text-left max-w-md mx-auto">
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div><div className="text-xs text-mono-light-grey uppercase mb-1">Subject</div><div className="font-bold text-white">{formData.subject}</div></div>
                        <div><div className="text-xs text-mono-light-grey uppercase mb-1">Category</div><div className="font-bold text-white uppercase">{TICKET_CATEGORIES.find(c => c.value === formData.category)?.label}</div></div>
                        <div><div className="text-xs text-mono-light-grey uppercase mb-1">Priority</div><div className="font-bold uppercase"><span className={PRIORITIES.find(p => p.value === formData.priority)?.color}>{formData.priority}</span></div></div>
                      </div>
                    </div>
                    <p className="text-sm text-mono-light-grey mb-8">A confirmation email has been sent to <span className="text-white">{formData.email}</span></p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link href="/help" className="px-8 py-3 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all text-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">Back to Help Center</Link>
                      <button onClick={handleReset} className="px-8 py-3 bg-transparent border-2 border-mono-dark-grey text-[#CCCCCC] font-bold uppercase tracking-wide hover:border-white hover:text-white transition-all focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">Submit Another Ticket</button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="form" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <form onSubmit={handleSubmit} className="bg-black border border-mono-dark-grey p-6 md:p-8" noValidate>
                    <h2 className="font-display font-bold text-xl sm:text-2xl uppercase text-white mb-6">Submit a Support Ticket</h2>

                    <AnimatePresence>
                      {ticketStatus === 'error' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 p-4 bg-red-600/10 border border-red-600 flex items-center gap-3" role="alert">
                          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" aria-hidden="true" />
                          <span className="text-red-500 text-sm uppercase">Failed to submit ticket. Please try again.</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div className="space-y-5" variants={rowVariants} initial="initial" animate="animate">
                      <motion.div variants={fieldVariants}>
                        <label htmlFor="ticket-subject" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Subject <span className="text-red-500">*</span></label>
                          <input id="ticket-subject" type="text" autoComplete="off" value={formData.subject} onChange={(e) => handleChange('subject', e.target.value)} placeholder="Brief description of your issue" className={`w-full bg-black border text-white px-4 py-3 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white transition-colors placeholder-[#666] min-h-touch ${errors.subject ? 'border-red-500' : 'border-white focus:border-white/50'}`} aria-invalid={!!errors.subject} aria-describedby={errors.subject ? 'subject-error' : undefined} />
                        {errors.subject && <p id="subject-error" className="text-[10px] text-red-500 mt-1 uppercase" role="alert">{errors.subject}</p>}
                      </motion.div>

                      <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" variants={fieldVariants}>
                        <div>
                          <label htmlFor="ticket-category" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Category <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <select id="ticket-category" value={formData.category} onChange={(e) => handleChange('category', e.target.value)} className={`appearance-none w-full bg-black border text-white px-4 py-3 pr-10 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white cursor-pointer transition-colors min-h-touch ${errors.category ? 'border-red-500' : 'border-white focus:border-white/50'}`} aria-invalid={!!errors.category} aria-describedby={errors.category ? 'category-error' : undefined}>
                              <option value="" disabled>Select category</option>
                              {TICKET_CATEGORIES.map((cat) => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                          </div>
                          {errors.category && <p id="category-error" className="text-[10px] text-red-500 mt-1 uppercase" role="alert">{errors.category}</p>}
                        </div>
                        <div>
                          <label htmlFor="ticket-priority" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Priority</label>
                          <div className="relative">
                            <select id="ticket-priority" value={formData.priority} onChange={(e) => handleChange('priority', e.target.value)} className="appearance-none w-full bg-black border border-white text-white px-4 py-3 pr-10 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white cursor-pointer transition-colors min-h-touch">
                              {PRIORITIES.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                          </div>
                        </div>
                      </motion.div>

                      <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" variants={fieldVariants}>
                        <div>
                          <label htmlFor="ticket-name" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Full Name <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
                            <input id="ticket-name" type="text" value={formData.fullName} onChange={(e) => handleChange('fullName', e.target.value)} placeholder="John Doe" autoComplete="name" className={`w-full bg-black border text-white pl-10 pr-4 py-3 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white transition-colors placeholder-[#666] min-h-touch ${errors.fullName ? 'border-red-500' : 'border-white focus:border-white/50'}`} aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? 'name-error' : undefined} />
                          </div>
                          {errors.fullName && <p id="name-error" className="text-[10px] text-red-500 mt-1 uppercase" role="alert">{errors.fullName}</p>}
                        </div>
                        <div>
                          <label htmlFor="ticket-email" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Email <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
                            <input id="ticket-email" type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="john@example.com" autoComplete="email" className={`w-full bg-black border text-white pl-10 pr-4 py-3 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white transition-colors placeholder-[#666] min-h-touch ${errors.email ? 'border-red-500' : 'border-white focus:border-white/50'}`} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} />
                          </div>
                          {errors.email && <p id="email-error" className="text-[10px] text-red-500 mt-1 uppercase" role="alert">{errors.email}</p>}
                        </div>
                      </motion.div>

                      <motion.div variants={fieldVariants}>
                        <label htmlFor="ticket-order" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Order Number <span className="text-mono-dark-grey">(optional)</span></label>
                        <div className="relative">
                          <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
                          <input id="ticket-order" type="text" autoComplete="off" value={formData.orderNumber} onChange={(e) => handleChange('orderNumber', e.target.value)} placeholder="EVT-XXXXXX" className="w-full bg-black border border-white text-white pl-10 pr-4 py-3 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white transition-colors placeholder-[#666] min-h-touch" />
                        </div>
                      </motion.div>

                      <motion.div variants={fieldVariants}>
                        <label htmlFor="ticket-message" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Message <span className="text-red-500">*</span></label>
                        <textarea id="ticket-message" value={formData.message} onChange={(e) => handleChange('message', e.target.value)} placeholder="Describe your issue in detail..." rows={6} className={`w-full bg-black border text-white px-4 py-3 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white transition-colors placeholder-[#666] resize-y min-h-[120px] ${errors.message ? 'border-red-500' : 'border-white focus:border-white/50'}`} aria-invalid={!!errors.message} aria-describedby={errors.message ? 'message-error' : undefined} />
                        <div className="flex justify-between mt-1">
                          {errors.message ? <p id="message-error" className="text-[10px] text-red-500 uppercase" role="alert">{errors.message}</p> : <span />}
                          <span className="text-[10px] text-mono-dark-grey">{formData.message.length} chars</span>
                        </div>
                      </motion.div>

                      <motion.div variants={fieldVariants}>
                        <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Attachment <span className="text-mono-dark-grey">(optional, max 5MB)</span></label>
                        {attachment ? (
                          <div className="flex items-center justify-between p-3 border border-white bg-white/5">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
                              <span className="text-sm text-white truncate">{attachment.name}</span>
                              <span className="text-xs text-mono-light-grey shrink-0">({(attachment.size / 1024).toFixed(0)} KB)</span>
                            </div>
                            <button type="button" onClick={() => setAttachment(null)} className="p-1 text-mono-light-grey hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white" aria-label="Remove attachment">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label htmlFor="ticket-attachment" className="flex items-center justify-center gap-2 p-4 border border-dashed border-mono-dark-grey hover:border-white transition-colors cursor-pointer min-h-touch">
                            <Upload className="w-4 h-4 text-mono-light-grey" aria-hidden="true" />
                            <span className="text-sm text-mono-light-grey">Choose file or drag &amp; drop</span>
                            <input id="ticket-attachment" type="file" onChange={handleFileChange} className="sr-only" accept="image/*,.pdf,.doc,.docx" />
                          </label>
                        )}
                        {errors.attachment && <p className="text-[10px] text-red-500 mt-1 uppercase" role="alert">{errors.attachment}</p>}
                      </motion.div>

                      <motion.div variants={fieldVariants} className="pt-2">
                        <button type="submit" disabled={ticketStatus === 'submitting'} className="w-full py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
                          {ticketStatus === 'submitting' ? (<><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />Submitting...</>) : (<><Send className="w-5 h-5" aria-hidden="true" />Submit Ticket</>)}
                        </button>
                      </motion.div>
                    </motion.div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
