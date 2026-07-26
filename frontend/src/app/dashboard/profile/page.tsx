'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  User, Shield, Mail, Smartphone, Camera,
  CheckCircle, Bell, Loader2
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton, ProfileFieldSkeleton } from '@/components/ui/skeleton';

interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'prefer-not',
  });
  const [memberSince, setMemberSince] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
    push: false,
  });

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const me = await apiClient.get<CurrentUser>('/auth/me');
      const safeMe: CurrentUser = me ?? {
        id: '',
        email: '',
        name: '',
        role: 'ATTENDEE',
        isActive: true,
        emailVerified: false,
        createdAt: new Date().toISOString(),
      };
      const nameParts = (safeMe.name || '').split(' ');
      setFormData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: safeMe.email || '',
        phone: '',
        dateOfBirth: '',
        gender: 'prefer-not',
      });
      setMemberSince(safeMe.createdAt);
      setEmailVerified(safeMe.emailVerified);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile, user]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      // Only name is editable through existing profile; email changes typically need verification.
      await apiClient.patch('/auth/me', { name: fullName });
      // Refresh user context so sidebar/nav reflect the new name
      if (refreshUser) await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display font-bold text-4xl uppercase text-white mb-2">
          My <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Profile</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-sm">
          {'// MANAGE_YOUR_ACCOUNT'}
        </p>
      </motion.div>

      {isLoading && (
        <div className="space-y-6" aria-busy="true" aria-live="polite">
          {/* Profile header card skeleton */}
          <div className="bg-black border border-mono-dark-grey p-6">
            <div className="flex items-center gap-6">
              <Skeleton variant="circle" className="w-24 h-24" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
          {/* Form skeleton */}
          <div className="bg-black border border-mono-dark-grey p-6">
            <Skeleton className="h-5 w-48 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ProfileFieldSkeleton />
              <ProfileFieldSkeleton />
              <ProfileFieldSkeleton />
              <ProfileFieldSkeleton />
              <ProfileFieldSkeleton />
              <ProfileFieldSkeleton />
            </div>
            <div className="mt-6 flex justify-end">
              <Skeleton className="h-11 w-32" />
            </div>
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="text-center py-12 border border-red-500/50 bg-red-500/5">
          <p className="text-red-400 text-sm uppercase tracking-widest mb-2">Failed to load profile</p>
          <p className="text-mono-light-grey text-sm mb-4">{error}</p>
          <button
            onClick={loadProfile}
            className="inline-block px-6 py-3 bg-white text-black font-bold uppercase tracking-wide"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['personal', 'security', 'notifications'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-bold uppercase border transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-white text-black border-white'
                    : 'bg-black text-[#CCCCCC] border-mono-dark-grey hover:border-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Personal Info Tab */}
          {activeTab === 'personal' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Profile Header */}
              <div className="bg-black border border-mono-dark-grey p-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                      <User className="w-12 h-12 text-black" />
                    </div>
                    <button
                      type="button"
                      className="absolute bottom-0 right-0 w-8 h-8 bg-white border-2 border-black rounded-full flex items-center justify-center hover:bg-[#CCCCCC] transition-colors"
                      aria-label="Upload profile image"
                    >
                      <Camera className="w-4 h-4 text-black" />
                    </button>
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-2xl uppercase text-white">
                      {formData.firstName} {formData.lastName}
                    </h2>
                    <p className="text-mono-light-grey text-sm">
                      Member since{' '}
                      {memberSince
                        ? new Date(memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="bg-black border border-mono-dark-grey p-6">
                <h3 className="font-bold uppercase text-white mb-6 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="profile-firstName" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="profile-firstName"
                      name="firstName"
                      autoComplete="given-name"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white uppercase min-h-touch"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-lastName" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="profile-lastName"
                      name="lastName"
                      autoComplete="family-name"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white uppercase min-h-touch"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-email" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" />
                      <input
                        type="email"
                        id="profile-email"
                        name="email"
                        autoComplete="email"
                        value={formData.email}
                        readOnly
                        aria-readonly="true"
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-black border border-white text-white px-12 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch opacity-70"
                      />
                      {emailVerified && (
                        <CheckCircle className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                      )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="profile-phone" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Smartphone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" />
                      <input
                        type="tel"
                        id="profile-phone"
                        name="phone"
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-black border border-white text-white px-12 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="profile-dob" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      id="profile-dob"
                      name="dateOfBirth"
                      autoComplete="bday"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-gender" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                      Gender
                    </label>
                    <select
                      id="profile-gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full bg-black border border-white text-white px-4 py-3 focus:outline-none focus:border-white/50"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-end items-center gap-3">
                  {error && <span className="text-xs text-red-400 uppercase">{error}</span>}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-3 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all flex items-center gap-2 disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving…
                      </>
                    ) : saved ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Saved!
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>

              {/* Verification Status */}
              <div className="bg-black border border-mono-dark-grey p-6">
                <h3 className="font-bold uppercase text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Verification Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-mono-dark-grey">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-white" />
                      <div>
                        <div className="font-bold uppercase text-white">Email</div>
                        <div className="text-xs text-mono-light-grey">{formData.email}</div>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-green-500 text-sm font-bold uppercase">
                      <CheckCircle className="w-4 h-4" />
                      {emailVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-mono-dark-grey">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-white" />
                      <div>
                        <div className="font-bold uppercase text-white">Phone</div>
                        <div className="text-xs text-mono-light-grey">{formData.phone || 'Not set'}</div>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-mono-light-grey text-sm font-bold uppercase">
                      {formData.phone ? 'Verified' : 'Not Set'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-black border border-mono-dark-grey p-6">
                <h3 className="font-bold uppercase text-white mb-6">Change Password</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label htmlFor="profile-current-password" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      id="profile-current-password"
                      name="currentPassword"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-new-password" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="profile-new-password"
                      name="newPassword"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-confirm-password" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="profile-confirm-password"
                      name="confirmPassword"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch"
                    />
                  </div>
                  <button
                    type="button"
                    className="px-6 py-3 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all"
                  >
                    Update Password
                  </button>
                </div>
              </div>

              <div className="bg-black border border-mono-dark-grey p-6">
                <h3 className="font-bold uppercase text-white mb-4">Two-Factor Authentication</h3>
                <p className="text-sm text-[#CCCCCC] mb-4">
                  Add an extra layer of security to your account
                </p>
                <button
                  type="button"
                  className="px-6 py-3 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all"
                >
                  Enable 2FA
                </button>
              </div>
            </motion.div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black border border-mono-dark-grey p-6"
            >
              <h3 className="font-bold uppercase text-white mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </h3>
              <div className="space-y-6">
                {[
                  { label: 'Email Notifications', desc: 'Receive updates about your orders and events', key: 'email' as const },
                  { label: 'SMS Notifications', desc: 'Get text messages for important updates', key: 'sms' as const },
                  { label: 'Push Notifications', desc: 'Browser notifications for live updates', key: 'push' as const },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-white/5 border border-mono-dark-grey">
                    <div>
                      <div className="font-bold uppercase text-white">{item.label}</div>
                      <div className="text-xs text-mono-light-grey">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications((n) => ({ ...n, [item.key]: !n[item.key] }))}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        notifications[item.key] ? 'bg-white' : 'bg-mono-dark-grey'
                      }`}
                      aria-label={`Toggle ${item.label}`}
                      aria-pressed={notifications[item.key]}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-black transition-transform ${
                          notifications[item.key] ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
