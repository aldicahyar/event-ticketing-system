'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Percent, AlertCircle, Save, Calendar, User, RefreshCw
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

interface TaxSetting {
  id: string;
  ppnPercent: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export default function TaxSettingsManagementPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useAuth();

  const [tax, setTax] = useState<TaxSetting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTax, setIsSavingTax] = useState(false);
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
      const res = await apiClient.get<{ tax: TaxSetting }>('/settings');
      if (res) {
        setTax(res.tax || null);
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

  const handleUpdateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tax) return;

    setError('');
    setSuccessMessage('');
    setIsSavingTax(true);
    try {
      await apiClient.patch(`/settings/tax`, {
        ppnPercent: Number(tax.ppnPercent),
        status: tax.status,
      });
      setSuccessMessage('Tax configuration updated successfully!');
      await fetchSettings();
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setIsSavingTax(false);
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
        <div className="text-xl uppercase animate-pulse font-mono">Loading tax settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-mono">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-4xl uppercase text-white mb-2">
          Tax <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Settings</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
          {'// CONFIGURE_PPN_TAX_RATE_AND_STATUS'}
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

      <div className="space-y-6 max-w-xl">
        <div className="flex items-center justify-between border-b border-mono-dark-grey pb-3">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold uppercase">PPN Tax Settings</h2>
          </div>
          <button
            onClick={fetchSettings}
            className="p-2 border border-mono-dark-grey hover:border-white transition-colors"
            aria-label="Refresh settings"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {tax && (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleUpdateTax}
            className="border border-mono-dark-grey p-5 space-y-4 bg-black"
          >
            <div>
              <label htmlFor="tax-ppn-rate" className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1.5">
                PPN Rate (Percent)
              </label>
              <div className="relative">
                <input
                  id="tax-ppn-rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={tax.ppnPercent}
                  onChange={(e) => {
                    const val = Number.parseFloat(e.target.value);
                    setTax({ ...tax, ppnPercent: Number.isNaN(val) ? 0 : val });
                  }}
                  className="w-full bg-black border border-white text-white pl-3 pr-8 py-2 text-sm focus:outline-none focus:border-white/50"
                />
                <span className="absolute right-3 top-2 text-sm font-bold text-mono-light-grey">%</span>
              </div>
            </div>

            {/* Status Dropdown for Tax */}
            <div>
              <label htmlFor="tax-status" className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1.5">
                Status
              </label>
              <select
                id="tax-status"
                value={tax.status}
                onChange={(e) => {
                  setTax({ ...tax, status: e.target.value });
                }}
                className="w-full bg-black border border-white text-white px-3 py-2 text-sm focus:outline-none focus:border-white/50 uppercase"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="NON_ACTIVE_DELETE">NON_ACTIVE_DELETE</option>
              </select>
            </div>

            {/* Audit Trail for Tax */}
            <div className="space-y-2 text-[10px] text-mono-light-grey border-t border-mono-dark-grey/50 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Created: {formatDate(tax.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>By: <span className="text-white uppercase">{tax.createdBy}</span></span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Updated: {formatDate(tax.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>By: <span className="text-white uppercase">{tax.updatedBy}</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingTax}
                className="px-4 py-2 bg-white text-black font-bold uppercase text-xs hover:bg-black hover:text-white border border-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingTax ? 'Saving...' : 'Save Tax'}
              </button>
            </div>
          </motion.form>
        )}
      </div>
    </div>
  );
}
