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
  Smartphone,
  Shield,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login({
        email: formData.email,
        password: formData.password,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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
              Welcome{' '}
              <span
                className="text-transparent stroke-text"
                style={{ WebkitTextStroke: '2px white' }}
              >
                Back
              </span>
            </h1>
            <p className="text-mono-light-grey uppercase tracking-widest text-sm">
              // SIGN_IN_TO_YOUR_ACCOUNT
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
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full bg-black border border-white text-white px-12 py-4 focus:outline-none focus:border-white/50 transition-colors placeholder-[#666]"
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
                  className="w-full bg-black border border-white text-white px-12 py-4 focus:outline-none focus:border-white/50 transition-colors placeholder-[#666]"
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
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) =>
                    setFormData({ ...formData, rememberMe: e.target.checked })
                  }
                  className="w-4 h-4 appearance-none bg-black border border-white checked:bg-white checked:text-black transition-colors cursor-pointer"
                />
                <span className="text-sm text-[#CCCCCC] uppercase">
                  Remember me
                </span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-white hover:underline uppercase tracking-wide"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-grow h-px bg-mono-dark-grey" />
            <span className="text-xs text-mono-light-grey uppercase">
              or continue with
            </span>
            <div className="flex-grow h-px bg-mono-dark-grey" />
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className="flex items-center justify-center gap-2 py-3 border border-mono-dark-grey hover:border-white transition-colors"
            >
              <Smartphone className="w-5 h-5" />
              <span className="text-sm font-bold uppercase">Google</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 py-3 border border-mono-dark-grey hover:border-white transition-colors"
            >
              <Smartphone className="w-5 h-5" />
              <span className="text-sm font-bold uppercase">Apple</span>
            </button>
          </div>

          {/* Sign Up Link */}
          <p className="text-center mt-8 text-sm text-[#CCCCCC]">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/register"
              className="text-white font-bold uppercase hover:underline"
            >
              Sign up
            </Link>
          </p>

          {/* Trust Badges */}
          <div className="mt-8 pt-8 border-t border-mono-dark-grey">
            <div className="flex items-center justify-center gap-6 text-xs text-mono-light-grey">
              <span className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-green-500" />
                Secure Login
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
