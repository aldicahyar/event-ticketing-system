'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/ui/Footer';
import {
  CheckCircle, AlertCircle, Clock, Shield,
  Send, ChevronDown, Loader2, User, Mail,
  FileText, ArrowRight
} from 'lucide-react';

const REFUND_REASONS = [
  { value: 'cancelled', label: 'Event Cancelled by Organizer' },
  { value: 'postponed', label: 'Event Postponed (cannot attend new date)' },
  { value: 'duplicate', label: 'Duplicate Purchase' },
  { value: 'medical', label: 'Medical Emergency' },
  { value: 'force_majeure', label: 'Force Majeure (natural disaster, pandemic, etc.)' },
  { value: 'other', label: 'Other' },
];

const POLICY_ITEMS = [
  {
    icon: CheckCircle,
    title: 'Eligible for Refund',
    items: [
      'Event cancelled by organizer',
      'Event postponed and you cannot attend the new date',
      'Duplicate purchase (same event, same ticket tier)',
      'Medical emergency (with documentation)',
      'Force majeure circumstances',
    ],
  },
  {
    icon: AlertCircle,
    title: 'Not Eligible',
    items: [
      'Change of mind',
      'Unable to attend (personal reasons)',
      'Missed event',
      'Travel or accommodation issues',
      'After 48 hours from purchase (unless event cancelled)',
    ],
  },
  {
    icon: Clock,
    title: 'Timeline',
    items: [
      'Refund request review: 1-2 business days',
      'Approved refund processing: 5-7 business days',
      'Bank transfer: 1-3 business days after approval',
      'Total estimated time: 7-12 business days',
    ],
  },
];

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' as const } },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

// Mock user data — in real app, get from session/context
const MOCK_USER = {
  name: 'John Doe',
  email: 'john.doe@example.com',
};

// Mock order history
const MOCK_ORDERS = [
  { id: 'EVT-001234', event: 'BRING ME THE HORIZON', date: '2026-03-15', status: 'upcoming' },
  { id: 'EVT-001235', event: 'BAD OMENS', date: '2026-05-20', status: 'upcoming' },
  { id: 'EVT-001198', event: 'NORTHLANE', date: '2025-11-20', status: 'completed' },
];

export default function RefundPage() {
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [refundNumber, setRefundNumber] = useState('');
  const [formData, setFormData] = useState({
    orderNumber: '',
    reason: '',
    detail: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.orderNumber) newErrors.orderNumber = 'Please select an order';
    if (!formData.reason) newErrors.reason = 'Please select a refund reason';
    if (!formData.detail.trim()) newErrors.detail = 'Please describe your refund request';
    else if (formData.detail.trim().length < 20) newErrors.detail = 'Minimum 20 characters';
    if (formData.notes.length > 500) newErrors.notes = 'Maximum 500 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setFormStatus('submitting');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const number = 'RFD-' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).substring(2, 5).toUpperCase();
    setRefundNumber(number);
    setFormStatus('success');
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const handleReset = () => {
    setFormData({ orderNumber: '', reason: '', detail: '', notes: '' });
    setFormStatus('idle');
    setRefundNumber('');
    setErrors({});
  };

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
        className="border-b border-mono-dark-grey py-12 md:py-16"
        aria-labelledby="refund-heading"
      >
        <div className="container mx-auto px-4 md:px-6">
          <h1 id="refund-heading" className="font-display font-bold text-3xl sm:text-4xl md:text-5xl uppercase text-white mb-2">
            Refund <span className="text-transparent stroke-text" style={{ WebkitTextStroke: '2px white' }} aria-hidden="true">Policy</span>
          </h1>
          <p className="text-mono-light-grey uppercase tracking-widest text-xs sm:text-sm mb-2">
            // UNDERSTAND_YOUR_RIGHTS
          </p>
          <p className="text-[#CCCCCC] text-sm">
            Read our policy below, then submit a refund request if eligible.
          </p>
        </div>
      </motion.section>

      {/* Policy Content */}
      <section className="py-12 md:py-16" aria-labelledby="policy-heading">
        <div className="container mx-auto px-4 md:px-6">
          <h2 id="policy-heading" className="sr-only">Refund Policy Details</h2>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {POLICY_ITEMS.map((section) => (
              <motion.div
                key={section.title}
                variants={staggerItem}
                className="bg-black border border-mono-dark-grey p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <section.icon className="w-6 h-6 text-white" aria-hidden="true" />
                  <h3 className="font-bold uppercase text-white text-sm">{section.title}</h3>
                </div>
                <ul className="space-y-2">
                  {section.items.map((item, i) => (
                    <li key={i} className="text-xs text-[#CCCCCC] flex items-start gap-2">
                      <span className="text-white mt-0.5" aria-hidden="true">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Refund Request Form */}
      <section className="py-12 md:py-16 border-t border-mono-dark-grey" aria-labelledby="refund-form-heading">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

            {/* Sidebar Info */}
            <aside className="lg:col-span-1" aria-label="Refund information">
              <div className="sticky top-24 bg-black border border-mono-dark-grey p-4 md:p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-white" aria-hidden="true" />
                    <h3 className="font-bold uppercase text-white text-sm">Secure Process</h3>
                  </div>
                  <p className="text-xs text-[#CCCCCC]">
                    Your refund request is encrypted and reviewed by our team. Bank details are requested only after approval via verified email.
                  </p>
                </div>

                <div className="pt-4 border-t border-mono-dark-grey">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-white" aria-hidden="true" />
                    <h3 className="font-bold uppercase text-white text-sm">Processing Time</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { step: 'Review', time: '1-2 days' },
                      { step: 'Approval', time: '1 day' },
                      { step: 'Transfer', time: '5-7 days' },
                    ].map((item) => (
                      <div key={item.step} className="flex items-center justify-between text-xs">
                        <span className="text-[#CCCCCC]">{item.step}</span>
                        <span className="text-white font-bold">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-mono-dark-grey">
                  <h3 className="font-bold uppercase text-white text-sm mb-2">Need Help?</h3>
                  <Link
                    href="/help/contact"
                    className="text-xs text-[#CCCCCC] hover:text-white transition-colors flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-white"
                  >
                    Contact Support <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </aside>

            {/* Form */}
            <div className="lg:col-span-3">
              <h2 id="refund-form-heading" className="font-display font-bold text-xl sm:text-2xl uppercase text-white mb-6">
                Submit Refund Request
              </h2>

              <AnimatePresence mode="wait">
                {formStatus === 'success' ? (
                  <motion.div key="success" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <div className="bg-black border border-green-500/50 p-6 md:p-8 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
                      >
                        <CheckCircle className="w-10 h-10 text-black" aria-hidden="true" />
                      </motion.div>

                      <h3 className="font-display font-bold text-2xl sm:text-3xl uppercase text-white mb-2">Request Submitted!</h3>
                      <p className="text-mono-light-grey uppercase tracking-widest text-sm mb-6">// WE_WILL_REVIEW_YOUR_REQUEST</p>

                      <div className="bg-white/5 p-6 mb-6 inline-block">
                        <div className="text-xs text-mono-light-grey uppercase tracking-widest mb-1">Refund Reference Number</div>
                        <div className="text-2xl font-display font-bold text-white tracking-widest">{refundNumber}</div>
                      </div>

                      <div className="bg-white/5 p-4 mb-6 text-left max-w-md mx-auto">
                        <div className="grid grid-cols-1 gap-3 text-sm">
                          <div><div className="text-xs text-mono-light-grey uppercase mb-1">Order</div><div className="font-bold text-white">{formData.orderNumber}</div></div>
                          <div><div className="text-xs text-mono-light-grey uppercase mb-1">Reason</div><div className="font-bold text-white uppercase">{REFUND_REASONS.find(r => r.value === formData.reason)?.label}</div></div>
                        </div>
                      </div>

                      <div className="bg-white/5 border border-mono-dark-grey p-4 mb-6 max-w-md mx-auto text-left">
                        <h4 className="font-bold uppercase text-white text-xs mb-2">What happens next?</h4>
                        <ol className="space-y-2 text-xs text-[#CCCCCC]">
                          <li className="flex items-start gap-2">
                            <span className="text-white font-bold">1.</span>
                            We review your request (1-2 business days)
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-white font-bold">2.</span>
                            If approved, we send email to <span className="text-white">{MOCK_USER.email}</span> for bank details
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-white font-bold">3.</span>
                            Refund processed within 5-7 business days after bank details received
                          </li>
                        </ol>
                      </div>

                      <p className="text-sm text-mono-light-grey mb-8">
                        A confirmation email has been sent to <span className="text-white">{MOCK_USER.email}</span>
                      </p>

                      <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                          href="/dashboard/orders"
                          className="px-8 py-3 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all text-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                        >
                          View My Orders
                        </Link>
                        <button
                          onClick={handleReset}
                          className="px-8 py-3 bg-transparent border-2 border-mono-dark-grey text-[#CCCCCC] font-bold uppercase tracking-wide hover:border-white hover:text-white transition-all focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                        >
                          Submit Another Request
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="form" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <form onSubmit={handleSubmit} className="bg-black border border-mono-dark-grey p-6 md:p-8" noValidate>

                      {/* Error Banner */}
                      <AnimatePresence>
                        {formStatus === 'error' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6 p-4 bg-red-600/10 border border-red-600 flex items-center gap-3"
                            role="alert"
                          >
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" aria-hidden="true" />
                            <span className="text-red-500 text-sm uppercase">Failed to submit request. Please try again.</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* User Info (Disabled) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div>
                          <label htmlFor="refund-name" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Full Name</label>
                          <div className="relative">
                            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mono-dark-grey" aria-hidden="true" />
                            <input
                              id="refund-name"
                              type="text"
                              value={MOCK_USER.name}
                              disabled
                              className="w-full bg-black/50 border border-mono-dark-grey text-mono-dark-grey pl-10 pr-4 py-3 text-base cursor-not-allowed min-h-touch"
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="refund-email" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Email</label>
                          <div className="relative">
                            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mono-dark-grey" aria-hidden="true" />
                            <input
                              id="refund-email"
                              type="email"
                              value={MOCK_USER.email}
                              disabled
                              className="w-full bg-black/50 border border-mono-dark-grey text-mono-dark-grey pl-10 pr-4 py-3 text-base cursor-not-allowed min-h-touch"
                            />
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-mono-dark-grey uppercase mb-6">
                        * Email is verified from your account. Bank details will be requested via this email after approval.
                      </p>

                      <div className="space-y-5">
                        {/* Order Number */}
                        <div>
                          <label htmlFor="refund-order" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                            Order Number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select
                              id="refund-order"
                              value={formData.orderNumber}
                              onChange={(e) => handleChange('orderNumber', e.target.value)}
                              className={`appearance-none w-full bg-black border text-white px-4 py-3 pr-10 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white cursor-pointer transition-colors min-h-touch ${
                                errors.orderNumber ? 'border-red-500' : 'border-white focus:border-white/50'
                              }`}
                              aria-invalid={!!errors.orderNumber}
                              aria-describedby={errors.orderNumber ? 'order-error' : undefined}
                            >
                              <option value="" disabled>Select an order</option>
                              {MOCK_ORDERS.map((order) => (
                                <option key={order.id} value={order.id}>
                                  {order.id} — {order.event} ({order.date})
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                          </div>
                          {errors.orderNumber && <p id="order-error" className="text-[10px] text-red-500 mt-1 uppercase" role="alert">{errors.orderNumber}</p>}
                        </div>

                        {/* Refund Reason */}
                        <div>
                          <label htmlFor="refund-reason" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                            Refund Reason <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select
                              id="refund-reason"
                              value={formData.reason}
                              onChange={(e) => handleChange('reason', e.target.value)}
                              className={`appearance-none w-full bg-black border text-white px-4 py-3 pr-10 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white cursor-pointer transition-colors min-h-touch ${
                                errors.reason ? 'border-red-500' : 'border-white focus:border-white/50'
                              }`}
                              aria-invalid={!!errors.reason}
                              aria-describedby={errors.reason ? 'reason-error' : undefined}
                            >
                              <option value="" disabled>Select a reason</option>
                              {REFUND_REASONS.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                          </div>
                          {errors.reason && <p id="reason-error" className="text-[10px] text-red-500 mt-1 uppercase" role="alert">{errors.reason}</p>}
                        </div>

                        {/* Refund Detail */}
                        <div>
                          <label htmlFor="refund-detail" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                            Refund Detail <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            id="refund-detail"
                            value={formData.detail}
                            onChange={(e) => handleChange('detail', e.target.value)}
                            placeholder="Explain why you are requesting a refund..."
                            rows={5}
                            className={`w-full bg-black border text-white px-4 py-3 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white transition-colors placeholder-[#666] resize-y min-h-[120px] ${
                              errors.detail ? 'border-red-500' : 'border-white focus:border-white/50'
                            }`}
                            aria-invalid={!!errors.detail}
                            aria-describedby={errors.detail ? 'detail-error' : undefined}
                          />
                          <div className="flex justify-between mt-1">
                            {errors.detail ? <p id="detail-error" className="text-[10px] text-red-500 uppercase" role="alert">{errors.detail}</p> : <span />}
                            <span className="text-[10px] text-mono-dark-grey">{formData.detail.length} chars (min 20)</span>
                          </div>
                        </div>

                        {/* Additional Notes */}
                        <div>
                          <label htmlFor="refund-notes" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                            Additional Notes <span className="text-mono-dark-grey">(optional)</span>
                          </label>
                          <textarea
                            id="refund-notes"
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            placeholder="Any additional information..."
                            rows={3}
                            className={`w-full bg-black border text-white px-4 py-3 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white transition-colors placeholder-[#666] resize-y min-h-[80px] ${
                              errors.notes ? 'border-red-500' : 'border-white focus:border-white/50'
                            }`}
                            aria-describedby={errors.notes ? 'notes-error' : undefined}
                          />
                          <div className="flex justify-between mt-1">
                            {errors.notes ? <p id="notes-error" className="text-[10px] text-red-500 uppercase" role="alert">{errors.notes}</p> : <span />}
                            <span className="text-[10px] text-mono-dark-grey">{formData.notes.length}/500</span>
                          </div>
                        </div>

                        {/* Submit */}
                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={formStatus === 'submitting'}
                            className="w-full py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                          >
                            {formStatus === 'submitting' ? (
                              <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />Submitting...</>
                            ) : (
                              <><Send className="w-5 h-5" aria-hidden="true" />Submit Refund Request</>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
