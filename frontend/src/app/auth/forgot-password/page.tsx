'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Lock, CheckCircle, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'success'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStep('success');
    } catch {
      setError('Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="main" className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black flex flex-col">
      
      {/* Navbar */}
      <nav className="p-4 sm:p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white" aria-hidden="true" />
          <span className="text-2xl font-display font-bold uppercase tracking-tight">EventTicket.</span>
        </Link>
      </nav>

      {/* Content */}
      <div className="flex-grow flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Back Link */}
          <Link 
            href="/auth/login"
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#CCCCCC] hover:text-white mb-8 transition-colors focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to Sign In
          </Link>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="mb-6 p-4 bg-red-600/10 border border-red-600 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" aria-hidden="true" />
              <span className="text-red-500 text-xs sm:text-sm uppercase">{error}</span>
            </motion.div>
          )}

          {/* Email Step */}
          {step === 'email' && (
            <>
              <div className="text-center mb-8">
                <Lock className="w-16 h-16 text-white mx-auto mb-4" aria-hidden="true" />
                <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase text-white mb-2">
                  Forgot <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }} aria-hidden="true">Password?</span>
                </h1>
                <p className="text-mono-light-grey uppercase tracking-widest text-xs sm:text-sm">
                  // ENTER_YOUR_EMAIL_TO_RESET
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="forgot-email" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
                    <input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black border border-white text-white text-base px-12 py-4 min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 focus:outline-none focus:border-white/50 transition-colors placeholder-[#666]"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  aria-label={loading ? 'Sending reset link, please wait' : 'Send password reset link'}
                  className="w-full py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 disabled:opacity-50 min-h-touch flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin" />
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-black" aria-hidden="true" />
              </div>

              <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase text-white mb-2">
                Check Your <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }} aria-hidden="true">Email</span>
              </h1>
              <p className="text-mono-light-grey uppercase tracking-widest text-xs sm:text-sm mb-8">
                // RESET_LINK_SENT
              </p>

              <div className="bg-white/5 border border-mono-dark-grey p-4 sm:p-6 mb-8">
                <p className="text-[#CCCCCC] mb-4 text-sm">
                  We&apos;ve sent a password reset link to:
                </p>
                <p className="text-white font-bold text-base sm:text-lg">{email}</p>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-mono-light-grey">
                  Didn&apos;t receive the email? Check your spam folder or{' '}
                  <button 
                    onClick={() => setStep('email')}
                    className="text-white underline hover:no-underline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    try again
                  </button>
                </p>
                
                <Link 
                  href="/auth/login"
                  className="inline-block px-8 py-3 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 min-h-touch leading-10 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  Back to Sign In
                </Link>
              </div>
            </motion.div>
          )}

        </motion.div>
      </div>
    </div>
  );
}
