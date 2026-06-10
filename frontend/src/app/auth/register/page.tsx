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
    <main className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black flex flex-col">
      {/* Navbar */}
      <nav className="p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white" />
          <span className="text-2xl font-display font-bold uppercase tracking-tight">
            EventTicket.
          </span>
        </Link>
      </nav>

      {/* Content */}
      <div className="flex-grow flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display font-bold text-4xl uppercase text-white mb-2">
              Create{' '}
              <span
                className="text-transparent stroke-text"
                style={{ WebkitTextStroke: '2px white' }}
              >
                Account
              </span>
            </h1>
            <p className="text-mono-light-grey uppercase tracking-widest text-sm">
              // JOIN_THE_COMMUNITY
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-600/10 border border-red-600 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span className="text-red-500 text-sm uppercase">{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full bg-black border border-white text-white px-12 py-3 focus:outline-none focus:border-white/50 transition-colors placeholder-[#666]"
                  placeholder="John Doe"
                  required
                  minLength={2}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full bg-black border border-white text-white px-12 py-3 focus:outline-none focus:border-white/50 transition-colors placeholder-[#666]"
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full bg-black border border-white text-white px-12 py-3 focus:outline-none focus:border-white/50 transition-colors placeholder-[#666]"
                  placeholder="********"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-mono-light-grey hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
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

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span
                      className={`flex items-center gap-1 ${
                        checks.length ? 'text-green-500' : 'text-mono-light-grey'
                      }`}
                    >
                      {checks.length ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}{' '}
                      8+ characters
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        checks.uppercase ? 'text-green-500' : 'text-mono-light-grey'
                      }`}
                    >
                      {checks.uppercase ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}{' '}
                      Uppercase
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        checks.lowercase ? 'text-green-500' : 'text-mono-light-grey'
                      }`}
                    >
                      {checks.lowercase ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}{' '}
                      Lowercase
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        checks.number ? 'text-green-500' : 'text-mono-light-grey'
                      }`}
                    >
                      {checks.number ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}{' '}
                      Number
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        checks.special ? 'text-green-500' : 'text-mono-light-grey'
                      }`}
                    >
                      {checks.special ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}{' '}
                      Special char
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  className={`w-full bg-black border text-white px-12 py-3 focus:outline-none transition-colors placeholder-[#666] ${
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
              <label className="flex items-start gap-3 cursor-pointer">
                <input
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
                  <Link href="/terms" className="text-white hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-white hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin" />
              ) : (
                <>
                  Create Account <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <p className="text-center mt-6 text-sm text-[#CCCCCC]">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-white font-bold uppercase hover:underline"
            >
              Sign in
            </Link>
          </p>

          {/* Trust Badges */}
          <div className="mt-8 pt-8 border-t border-mono-dark-grey">
            <div className="flex items-center justify-center gap-6 text-xs text-mono-light-grey">
              <span className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-green-500" />
                Secure Registration
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                SSL Encrypted
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
