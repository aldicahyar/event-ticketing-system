'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const passwordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
    return checks;
  };

  const getStrengthLevel = (password: string) => {
    const checks = passwordStrength(password);
    const passed = Object.values(checks).filter(Boolean).length;
    return passed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const checks = passwordStrength(formData.password);
    const failedChecks = Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([key]) => key);

    if (failedChecks.length > 0) {
      setError('Password does not meet all requirements');
      setLoading(false);
      return;
    }

    if (!formData.agreeTerms) {
      setError('Please agree to the terms and conditions');
      setLoading(false);
      return;
    }

    try {
      await register({
        email: formData.email,
        name: formData.name,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const checks = passwordStrength(formData.password);
  const strengthLevel = getStrengthLevel(formData.password);

  return (
    <main role="main" className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black flex flex-col">
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
              Create{' '}
              <span
                className="text-transparent stroke-text"
                style={{ WebkitTextStroke: '2px white' }}
                aria-hidden="true"
              >
                Account
              </span>
            </h1>
            <p className="text-mono-light-grey uppercase tracking-widest text-xs sm:text-sm">
              // JOIN_THE_COMMUNITY
            </p>
          </div>

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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="register-name" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
                <input
                  id="register-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full bg-black border border-white text-white text-base px-12 py-3 min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 focus:outline-none focus:border-white/50 transition-colors placeholder-[#666]"
                  placeholder="John Doe"
                  required
                  minLength={2}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full bg-black border border-white text-white text-base px-12 py-3 min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 focus:outline-none focus:border-white/50 transition-colors placeholder-[#666]"
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="register-password" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full bg-black border border-white text-white text-base px-12 py-3 min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 focus:outline-none focus:border-white/50 transition-colors placeholder-[#666]"
                  placeholder="********"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-mono-light-grey hover:text-white transition-colors min-h-touch flex items-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Eye className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 ${
                          strengthLevel >= level
                            ? level <= 2
                              ? 'bg-red-500'
                              : level <= 3
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                            : 'bg-mono-dark-grey'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <span
                      className={`flex items-center gap-1 ${
                        checks.length ? 'text-green-500' : 'text-mono-light-grey'
                      }`}
                    >
                      {checks.length ? (
                        <Check className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <X className="w-3 h-3" aria-hidden="true" />
                      )}{' '}
                      8+ characters
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        checks.uppercase ? 'text-green-500' : 'text-mono-light-grey'
                      }`}
                    >
                      {checks.uppercase ? (
                        <Check className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <X className="w-3 h-3" aria-hidden="true" />
                      )}{' '}
                      Uppercase
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        checks.lowercase ? 'text-green-500' : 'text-mono-light-grey'
                      }`}
                    >
                      {checks.lowercase ? (
                        <Check className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <X className="w-3 h-3" aria-hidden="true" />
                      )}{' '}
                      Lowercase
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        checks.number ? 'text-green-500' : 'text-mono-light-grey'
                      }`}
                    >
                      {checks.number ? (
                        <Check className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <X className="w-3 h-3" aria-hidden="true" />
                      )}{' '}
                      Number
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        checks.special ? 'text-green-500' : 'text-mono-light-grey'
                      }`}
                    >
                      {checks.special ? (
                        <Check className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <X className="w-3 h-3" aria-hidden="true" />
                      )}{' '}
                      Special char
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="register-confirm-password" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  className={`w-full bg-black border text-white text-base px-12 py-3 min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 focus:outline-none transition-colors placeholder-[#666] ${
                    formData.confirmPassword &&
                    formData.password !== formData.confirmPassword
                      ? 'border-red-500'
                      : 'border-white focus:border-white/50'
                  }`}
                  placeholder="********"
                  required
                />
              </div>
              {formData.confirmPassword &&
                formData.password !== formData.confirmPassword && (
                  <p className="text-[10px] text-red-500 mt-1 uppercase">
                    Passwords do not match
                  </p>
                )}
            </div>

            {/* Terms Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
                <input
                  id="register-terms"
                  type="checkbox"
                  checked={formData.agreeTerms}
                  onChange={(e) =>
                    setFormData({ ...formData, agreeTerms: e.target.checked })
                  }
                  className="w-4 h-4 mt-0.5 appearance-none bg-black border border-white checked:bg-white checked:text-black transition-colors cursor-pointer"
                  required
                />
                <span className="text-xs text-[#CCCCCC]">
                  I agree to the{' '}
                  <Link href="/terms" className="text-white hover:underline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-white hover:underline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              aria-label={loading ? 'Creating account, please wait' : 'Create your account'}
              className="w-full py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-4 min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin" />
              ) : (
                <>
                  Create Account <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <p className="text-center mt-6 text-xs sm:text-sm text-[#CCCCCC]">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-white font-bold uppercase hover:underline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              Sign in
            </Link>
          </p>

          {/* Trust Badges */}
          <div className="mt-8 pt-8 border-t border-mono-dark-grey">
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs text-mono-light-grey">
              <span className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-green-500" aria-hidden="true" />
                Secure Registration
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />
                SSL Encrypted
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
