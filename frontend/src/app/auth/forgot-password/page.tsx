'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Lock, CheckCircle, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'success'>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    setStep('success');
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black flex flex-col">
      
      {/* Navbar */}
      <nav className="p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white" />
          <span className="text-2xl font-display font-bold uppercase tracking-tight">EventTicket.</span>
        </Link>
      </nav>

      {/* Content */}
      <div className="flex-grow flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Back Link */}
          <Link 
            href="/auth/login"
            className="inline-flex items-center gap-2 text-sm text-[#CCCCCC] hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>

          {/* Email Step */}
          {step === 'email' && (
            <>
              <div className="text-center mb-8">
                <Lock className="w-16 h-16 text-white mx-auto mb-4" />
                <h1 className="font-display font-bold text-3xl uppercase text-white mb-2">
                  Forgot <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Password?</span>
                </h1>
                <p className="text-mono-light-grey uppercase tracking-widest text-sm">
                  // ENTER_YOUR_EMAIL_TO_RESET
                </p>
              </div>
              //
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black border border-white text-white px-12 py-4 focus:outline-none focus:border-white/50 transition-colors placeholder-[#666]"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin mx-auto" />
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
                <CheckCircle className="w-10 h-10 text-black" />
              </div>

              <h1 className="font-display font-bold text-3xl uppercase text-white mb-2">
                Check Your <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Email</span>
              </h1>
              <p className="text-mono-light-grey uppercase tracking-widest text-sm mb-8">
                // RESET_LINK_SENT
              </p>

              <div className="bg-white/5 border border-mono-dark-grey p-6 mb-8">
                <p className="text-[#CCCCCC] mb-4">
                  We've sent a password reset link to:
                </p>
                <p className="text-white font-bold text-lg">{email}</p>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-mono-light-grey">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button 
                    onClick={() => setStep('email')}
                    className="text-white underline hover:no-underline"
                  >
                    try again
                  </button>
                </p>
                
                <Link 
                  href="/auth/login"
                  className="inline-block px-8 py-3 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300"
                >
                  Back to Sign In
                </Link>
              </div>
            </motion.div>
          )}

        </motion.div>
      </div>
    </main>
  );
}
