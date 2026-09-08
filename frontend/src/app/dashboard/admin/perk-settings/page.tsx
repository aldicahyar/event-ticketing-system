'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Tag, AlertCircle, Save, Plus, Edit2, Check, X, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { normalizePerkList, PerkItem } from '@/components/events/PerksCombobox';

export default function PerkSettingsManagementPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useAuth();

  const [perks, setPerks] = useState<PerkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<PerkItem>>({
    label: '',
    type: 'PERK',
    status: 'ACTIVE'
  });

  // Auth guard
  useEffect(() => {
    if (!authLoading && !apiClient.getUser()) {
      router.push('/auth/login');
    }
  }, [authLoading, router]);

  const fetchPerks = async () => {
    setIsLoading(true);
    setError('');
    try {
      // `all=true` includes NON_ACTIVE items for the admin table.
      const res = await apiClient.get('/settings/perks', { all: true });
      setPerks(normalizePerkList(res));
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerks();
  }, []);

  const handleSave = async (id?: string) => {
    if (!formData.label?.trim()) {
      setError('Name is required');
      return;
    }

    setError('');
    setSuccessMessage('');

    // Backend DTO (CreatePerkDto/UpdatePerkDto) expects { label, type, status }.
    const payload = {
      label: formData.label.trim(),
      type: formData.type,
      status: formData.status,
    };

    try {
      if (id) {
        // Edit existing
        await apiClient.patch(`/settings/perks/${id}`, payload);
        setSuccessMessage('Perk updated successfully!');
      } else {
        // Create new
        await apiClient.post('/settings/perks', payload);
        setSuccessMessage('Perk created successfully!');
      }

      setFormData({ label: '', type: 'PERK', status: 'ACTIVE' });
      setIsAdding(false);
      setEditingId(null);
      await fetchPerks();
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    }
  };

  const handleToggleStatus = async (perk: PerkItem) => {
    const newStatus = perk.status === 'ACTIVE' ? 'NON_ACTIVE' : 'ACTIVE';
    try {
      await apiClient.patch(`/settings/perks/${perk.id}`, { status: newStatus });
      await fetchPerks();
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    }
  };

  const startEdit = (perk: PerkItem) => {
    setEditingId(perk.id);
    setFormData({ label: perk.label, type: perk.type, status: perk.status });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ label: '', type: 'PERK', status: 'ACTIVE' });
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-xl uppercase animate-pulse font-mono">Loading perk settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-mono">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-4xl uppercase text-white mb-2">
          Perk <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Settings</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
          {'// CONFIGURE_MASTER_DATA_FOR_PERKS_AND_FACILITIES'}
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

      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between border-b border-mono-dark-grey pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold uppercase">Perks & Facilities</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsAdding(true);
                setEditingId(null);
                setFormData({ label: '', type: 'PERK', status: 'ACTIVE' });
              }}
              className="px-4 py-2 bg-white text-black text-xs font-bold uppercase flex items-center gap-2 hover:bg-mono-light-grey transition-colors"
            >
              <Plus className="w-4 h-4" /> Add New
            </button>
            <button
              onClick={fetchPerks}
              className="p-2 border border-mono-dark-grey hover:border-white transition-colors"
              aria-label="Refresh settings"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form area for adding/editing */}
        {(isAdding || editingId) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-2 border-white p-5 space-y-4 bg-black"
          >
            <h3 className="font-bold text-lg uppercase text-white border-b border-mono-dark-grey pb-2">
              {isAdding ? 'Add New Item' : 'Edit Item'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.label || ''}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g. VIP Lounge"
                  className="w-full bg-black border border-mono-dark-grey text-white px-3 py-2 text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1.5">
                  Type
                </label>
                <select
                  value={formData.type || 'PERK'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'PERK' | 'FACILITY' })}
                  className="w-full bg-black border border-mono-dark-grey text-white px-3 py-2 text-sm focus:outline-none focus:border-white uppercase transition-colors"
                >
                  <option value="PERK">PERK</option>
                  <option value="FACILITY">FACILITY</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1.5">
                  Status
                </label>
                <select
                  value={formData.status || 'ACTIVE'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'NON_ACTIVE' })}
                  className="w-full bg-black border border-mono-dark-grey text-white px-3 py-2 text-sm focus:outline-none focus:border-white uppercase transition-colors"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="NON_ACTIVE">NON_ACTIVE</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 border border-mono-dark-grey text-white font-bold uppercase text-xs hover:border-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSave(editingId || undefined)}
                className="px-4 py-2 bg-white text-black font-bold uppercase text-xs hover:bg-mono-light-grey transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </motion.div>
        )}

        {/* Table */}
        <div className="border border-mono-dark-grey overflow-x-auto bg-black">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-mono-dark-grey text-[10px] text-mono-light-grey uppercase tracking-widest bg-mono-dark-grey/20">
                <th className="p-4 font-normal">Name</th>
                <th className="p-4 font-normal">Type</th>
                <th className="p-4 font-normal">Status</th>
                <th className="p-4 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {perks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-mono-light-grey uppercase text-xs">
                    No perks or facilities found.
                  </td>
                </tr>
              ) : (
                perks.map((perk) => (
                  <tr key={perk.id} className="border-b border-mono-dark-grey hover:bg-white/5 transition-colors group">
                    <td className="p-4 font-bold text-white">{perk.label}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 text-[10px] font-bold uppercase border border-mono-dark-grey text-mono-light-grey">
                        {perk.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase border ${
                        perk.status === 'ACTIVE' 
                          ? 'border-green-500/50 text-green-400 bg-green-500/10' 
                          : 'border-red-500/50 text-red-400 bg-red-500/10'
                      }`}>
                        {perk.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(perk)}
                          className="p-1.5 border border-transparent hover:border-mono-dark-grey text-mono-light-grey hover:text-white transition-colors"
                          title={`Toggle Status to ${perk.status === 'ACTIVE' ? 'Inactive' : 'Active'}`}
                        >
                          {perk.status === 'ACTIVE' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => startEdit(perk)}
                          className="p-1.5 border border-transparent hover:border-mono-dark-grey text-mono-light-grey hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
