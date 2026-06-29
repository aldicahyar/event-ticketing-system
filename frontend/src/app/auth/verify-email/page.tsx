'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Mail,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail, resendVerification, isAuthenticated, user } = useAuth();
  
  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Sync email param
  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // If already authenticated and email is verified, go to dashboard
  useEffect(() => {
    if (isAuthenticated && user && user.emailVerified) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  // Countdown timer for resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer, canResend]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1); // take only last char
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) return;

    const chars = pastedData.split('');
    setCode(chars);
    inputRefs.current[5]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (!email) {
      setError('Email address is missing.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await verifyEmail(email, verificationCode);
      setSuccess('Email verified successfully! Redirecting...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Email address is missing.');
      return;
    }

    setResending(true);
    setError('');
    setSuccess('');

    try {
      await resendVerification(email);
      setSuccess('Verification code resent successfully. Please check your inbox!');
      setTimer(60);
      setCanResend(false);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div role="main" className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black flex flex-col">
      {/* Navbar */}
      <nav className="p-4 sm:p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white" aria-hidden="true" />
          <span className="text-2xl font-display font-bold uppercase tracking-tight">
            EventTicket.
          </span>
        </Link>
      </nav>

      {/* Content */}
      <div className="flex-grow flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase text-white mb-2">
              Verify{' '}
              <span
                className="text-transparent stroke-text"
                style={{ WebkitTextStroke: '2px white' }}
                aria-hidden="true"
              >
                Email
              </span>
            </h1>
            <p className="text-mono-light-grey uppercase tracking-widest text-xs sm:text-sm">
              // ENTER_THE_VERIFICATION_CODE
            </p>
          </div>

          {/* Messages */}
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

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-green-600/10 border border-green-600 flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" aria-hidden="true" />
              <span className="text-green-500 text-xs sm:text-sm uppercase">{success}</span>
            </motion.div>
          )}

          {/* Card */}
          <div className="bg-black border border-white p-6 sm:p-8 space-y-6">
            {!emailParam && !email ? (
              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-[#CCCCCC] uppercase leading-relaxed">
                  Please enter the email address associated with your registration to request a verification code:
                </p>
                <div>
                  <label htmlFor="verify-email-input" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
                    <input
                      id="verify-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black border border-white text-white text-base px-12 py-4 min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 focus:outline-none focus:border-white/50 transition-colors placeholder-[#666]"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || !email}
                  className="w-full py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 min-h-touch"
                >
                  {resending ? 'Sending...' : 'Request Code'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-[#CCCCCC] uppercase leading-relaxed mb-4">
                    Code sent to <span className="text-white font-bold">{email}</span>
                  </p>
                  
                  {/* Code Input Fields */}
                  <div className="flex justify-between gap-2 max-w-xs mx-auto">
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={index === 0 ? handlePaste : undefined}
                        className="w-10 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-bold bg-black border-2 border-white text-white focus-visible:outline-2 focus-visible:outline-white focus:outline-none focus:border-white/50 transition-colors"
                        aria-label={`Digit ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || code.some(d => !d)}
                  className="w-full py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 min-h-touch"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin" />
                  ) : (
                    <>
                      Verify Code <ArrowRight className="w-5 h-5" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Resend and Actions */}
            {email && (
              <div className="flex flex-col items-center justify-center gap-4 pt-4 border-t border-mono-dark-grey">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || !canResend}
                  className="text-xs uppercase font-bold tracking-wider text-[#CCCCCC] hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                  {canResend ? 'Resend Verification Code' : `Resend Code in ${timer}s`}
                </button>
              </div>
            )}
          </div>

          {/* Back to Login */}
          <p className="text-center mt-8 text-xs sm:text-sm text-[#CCCCCC]">
            Back to{' '}
            <Link
              href="/auth/login"
              className="text-white font-bold uppercase hover:underline focus-visible:outline-2 focus-visible:outline-white"
            >
              Sign In
            </Link>
          </p>

          {/* Secure Badges */}
          <div className="mt-8 pt-8 border-t border-mono-dark-grey flex flex-wrap items-center justify-center gap-4 text-xs text-mono-light-grey">
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-green-500" aria-hidden="true" />
              Secure Verification
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />
              Identity Confirmed
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-xl uppercase animate-pulse">Loading Verification...</div>
      </div>
    }>
      <VerifyEmailContent />
    </React.Suspense>
  );
}
