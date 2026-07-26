'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Layers, AlertCircle, Save, Calendar, User, RefreshCw
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

interface TicketTierSetting {
  id: string;
  ratio: number;
  multiplier: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export default function TierSettingsManagementPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useAuth();

  const [tiers, setTiers] = useState<TicketTierSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTier, setIsSavingTier] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auth guard
  useEffect(() => {
    if (!authLoading && !apiClient.getUser()) {
      router.push('/auth/login');
    }
  }, [authLoading, router]);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await apiClient.get<{ tiers: TicketTierSetting[] }>('/settings');
      if (res) {
        setTiers(res.tiers || []);
      }
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdateTier = async (tierId: string, ratio: number, multiplier: number, status: string) => {
    setError('');
    setSuccessMessage('');
    setIsSavingTier(tierId);
    try {
      await apiClient.patch(`/settings/tier`, {
        id: tierId,
        ratio: Number(ratio),
        multiplier: Number(multiplier),
        status,
      });
      setSuccessMessage(`Ticket category ${tierId} updated successfully!`);
      await fetchSettings();
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setIsSavingTier(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-xl uppercase animate-pulse font-mono">Loading tier settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-mono">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-4xl uppercase text-white mb-2">
          Ticket Tier <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Settings</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
          {'// CONFIGURE_TICKET_RATIOS_AND_MULTIPLIERS'}
        </p>
      </div>

      {/* Status Notifications */}
      {successMessage && (
        <div className="p-4 bg-green-500/10 border border-green-500 flex items-center gap-3 text-green-500 font-bold uppercase text-sm">
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-600/10 border border-red-600 flex items-center gap-3 text-red-500 font-bold uppercase text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between border-b border-mono-dark-grey pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold uppercase">Ticket Tier Settings</h2>
          </div>
          <button
            onClick={fetchSettings}
            className="p-2 border border-mono-dark-grey hover:border-white transition-colors"
            aria-label="Refresh settings"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6">
          {tiers.map((tier) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-mono-dark-grey p-5 space-y-4 bg-black"
            >
              <div className="flex justify-between items-center border-b border-mono-dark-grey pb-2">
                <span className="font-bold text-lg text-white uppercase">{tier.id} TIER</span>
                <span className={`px-2 py-0.5 text-xs font-bold uppercase ${
                  tier.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500 border border-green-500' : 'bg-red-500/20 text-red-500 border border-red-500'
                }`}>
                  {tier.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Ratio Input */}
                <div>
                  <label htmlFor={`ratio-${tier.id}`} className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1.5">
                    Row Ratio Limit (0.0 - 1.0)
                  </label>
                  <input
                    id={`ratio-${tier.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    required
                    value={tier.ratio}
                    onChange={(e) => {
                      const val = Number.parseFloat(e.target.value);
                      setTiers(tiers.map(t => t.id === tier.id ? { ...t, ratio: Number.isNaN(val) ? 0 : val } : t));
                    }}
                    className="w-full bg-black border border-white text-white px-3 py-2 text-sm focus:outline-none focus:border-white/50"
                  />
                </div>

                {/* Multiplier Input */}
                <div>
                  <label htmlFor={`multiplier-${tier.id}`} className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1.5">
                    Price Multiplier
                  </label>
                  <input
                    id={`multiplier-${tier.id}`}
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={tier.multiplier}
                    onChange={(e) => {
                      const val = Number.parseFloat(e.target.value);
                      setTiers(tiers.map(t => t.id === tier.id ? { ...t, multiplier: Number.isNaN(val) ? 1 : val } : t));
                    }}
                    className="w-full bg-black border border-white text-white px-3 py-2 text-sm focus:outline-none focus:border-white/50"
                  />
                </div>

                {/* Status Dropdown */}
                <div>
                  <label htmlFor={`status-${tier.id}`} className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1.5">
                    Status
                  </label>
                  <select
                    id={`status-${tier.id}`}
                    value={tier.status}
                    onChange={(e) => {
                      setTiers(tiers.map(t => t.id === tier.id ? { ...t, status: e.target.value } : t));
                    }}
                    className="w-full bg-black border border-white text-white px-3 py-2 text-sm focus:outline-none focus:border-white/50 uppercase"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="NON_ACTIVE_DELETE">NON_ACTIVE_DELETE</option>
                  </select>
                </div>
              </div>

              {/* Audit Trail for Tiers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-mono-light-grey border-t border-mono-dark-grey/50 pt-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Created: {formatDate(tier.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>By: <span className="text-white uppercase">{tier.createdBy}</span></span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Updated: {formatDate(tier.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>By: <span className="text-white uppercase">{tier.updatedBy}</span></span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isSavingTier === tier.id}
                  onClick={() => handleUpdateTier(tier.id, tier.ratio, tier.multiplier, tier.status)}
                  className="px-4 py-2 bg-white text-black font-bold uppercase text-xs hover:bg-black hover:text-white border border-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingTier === tier.id ? 'Saving...' : `Save ${tier.id}`}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
