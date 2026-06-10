'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  User, Ticket, Clock, Settings, LogOut, 
  ArrowRight, Calendar, CreditCard, Bell,
  ChevronRight, Shield, Mail, Smartphone, Camera,
  CheckCircle, AlertCircle
} from 'lucide-react';

const USER = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+62 812 3456 7890',
  dateOfBirth: '1995-06-15',
  gender: 'male',
  memberSince: '2024-03-15',
  emailVerified: true,
  phoneVerified: true,
  notifications: {
    email: true,
    sms: true,
    push: false
  }
};

const DASHBOARD_LINKS = [
  { href: '/dashboard', label: 'Overview', icon: CreditCard },
  { href: '/dashboard/orders', label: 'Orders', icon: CreditCard },
  { href: '/dashboard/my-tickets', label: 'My Tickets', icon: Ticket },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];

export default function ProfilePage() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    firstName: USER.firstName,
    lastName: USER.lastName,
    email: USER.email,
    phone: USER.phone,
    dateOfBirth: USER.dateOfBirth,
    gender: USER.gender
  });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaved(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaved(false);
  };

  return (
    <main className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white" />
            <span className="text-xl font-display font-bold uppercase">EventTicket.</span>
          </Link>
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-white/10 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-black" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-black border border-mono-dark-grey p-4 sticky top-24">
              <nav className="space-y-1">
                {DASHBOARD_LINKS.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 px-4 py-3 transition-all ${
                        isActive 
                          ? 'bg-white text-black' 
                          : 'text-[#CCCCCC] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <link.icon className="w-5 h-5" />
                      <span className="font-bold uppercase text-sm">{link.label}</span>
                    </Link>
                  );
                })}
                <button className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-600/10 transition-all">
                  <LogOut className="w-5 h-5" />
                  <span className="font-bold uppercase text-sm">Sign Out</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="font-display font-bold text-4xl uppercase text-white mb-2">
                My <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Profile</span>
              </h1>
              <p className="text-mono-light-grey uppercase tracking-widest text-sm">
                // MANAGE_YOUR_ACCOUNT
              </p>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {['personal', 'security', 'notifications', 'preferences'].map((tab) => (
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
                      <button className="absolute bottom-0 right-0 w-8 h-8 bg-white border-2 border-black rounded-full flex items-center justify-center hover:bg-[#CCCCCC] transition-colors">
                        <Camera className="w-4 h-4 text-black" />
                      </button>
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-2xl uppercase text-white">
                        {USER.firstName} {USER.lastName}
                      </h2>
                      <p className="text-mono-light-grey text-sm">
                        Member since {new Date(USER.memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
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
                      <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full bg-black border border-white text-white px-4 py-3 focus:outline-none focus:border-white/50 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full bg-black border border-white text-white px-4 py-3 focus:outline-none focus:border-white/50 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full bg-black border border-white text-white px-12 py-3 focus:outline-none focus:border-white/50"
                        />
                        {USER.emailVerified && (
                          <CheckCircle className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Smartphone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full bg-black border border-white text-white px-12 py-3 focus:outline-none focus:border-white/50"
                        />
                        {USER.phoneVerified && (
                          <CheckCircle className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full bg-black border border-white text-white px-4 py-3 focus:outline-none focus:border-white/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                        Gender
                      </label>
                      <select
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

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleSave}
                      className="px-8 py-3 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all flex items-center gap-2"
                    >
                      {saved ? (
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
                          <div className="text-xs text-mono-light-grey">{USER.email}</div>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-green-500 text-sm font-bold uppercase">
                        <CheckCircle className="w-4 h-4" />
                        Verified
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 border border-mono-dark-grey">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-white" />
                        <div>
                          <div className="font-bold uppercase text-white">Phone</div>
                          <div className="text-xs text-mono-light-grey">{USER.phone}</div>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-green-500 text-sm font-bold uppercase">
                        <CheckCircle className="w-4 h-4" />
                        Verified
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
                      <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-black border border-white text-white px-4 py-3 focus:outline-none focus:border-white/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-black border border-white text-white px-4 py-3 focus:outline-none focus:border-white/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-black border border-white text-white px-4 py-3 focus:outline-none focus:border-white/50"
                      />
                    </div>
                    <button className="px-6 py-3 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all">
                      Update Password
                    </button>
                  </div>
                </div>

                <div className="bg-black border border-mono-dark-grey p-6">
                  <h3 className="font-bold uppercase text-white mb-4">Two-Factor Authentication</h3>
                  <p className="text-sm text-[#CCCCCC] mb-4">
                    Add an extra layer of security to your account
                  </p>
                  <button className="px-6 py-3 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all">
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
                    { label: 'Email Notifications', desc: 'Receive updates about your orders and events', key: 'email' },
                    { label: 'SMS Notifications', desc: 'Get text messages for important updates', key: 'sms' },
                    { label: 'Push Notifications', desc: 'Browser notifications for live updates', key: 'push' }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-white/5 border border-mono-dark-grey">
                      <div>
                        <div className="font-bold uppercase text-white">{item.label}</div>
                        <div className="text-xs text-mono-light-grey">{item.desc}</div>
                      </div>
                      <button
                        className={`w-12 h-6 rounded-full transition-colors ${
                          USER.notifications[item.key as keyof typeof USER.notifications]
                            ? 'bg-white' 
                            : 'bg-mono-dark-grey'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-black transition-transform ${
                          USER.notifications[item.key as keyof typeof USER.notifications]
                            ? 'translate-x-7' 
                            : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}
