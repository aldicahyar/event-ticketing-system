'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Tag, AlertCircle, X, Armchair, Users } from 'lucide-react';
import { formatNumberWithDots, parseDotsToNumber } from '@/lib/currency';

export interface TicketTierInput {
  id?: string;
  name: string;
  price: number;
  stock: number;
  description?: string;
  features?: string[];
  is_seated?: boolean;
  start_date_time: string;
  end_date_time: string;
}

interface TicketTiersEditorProps {
  tiers: TicketTierInput[];
  onChange: (tiers: TicketTierInput[]) => void;
  currency?: string;
  maxTiers?: number;
  defaultSalesStart?: string;
  defaultSalesEnd?: string;
}

export function TicketTiersEditor({
  tiers,
  onChange,
  currency = 'IDR',
  maxTiers = 10,
  defaultSalesStart,
  defaultSalesEnd,
}: TicketTiersEditorProps) {
  const [newFeatureInputs, setNewFeatureInputs] = useState<{ [key: number]: string }>({});

  const handleAddTier = () => {
    if (tiers.length >= maxTiers) return;
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const newTier: TicketTierInput = {
      name: tiers.length === 0 ? 'Regular' : tiers.length === 1 ? 'VIP' : `Tier ${tiers.length + 1}`,
      price: 150000,
      stock: 100,
      description: '',
      features: ['Standard Entry'],
      is_seated: false, // Default to Standing/General Admission
      start_date_time: defaultSalesStart || now.toISOString().slice(0, 16),
      end_date_time: defaultSalesEnd || future.toISOString().slice(0, 16),
    };

    onChange([...tiers, newTier]);
  };

  const handleRemoveTier = (index: number) => {
    const updated = tiers.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateTier = (index: number, field: keyof TicketTierInput, value: any) => {
    const updated = tiers.map((tier, i) => {
      if (i !== index) return tier;
      return { ...tier, [field]: value };
    });
    onChange(updated);
  };

  const handleAddFeature = (tierIndex: number) => {
    const inputVal = (newFeatureInputs[tierIndex] || '').trim();
    if (!inputVal) return;

    const currentFeatures = tiers[tierIndex].features || [];
    if (!currentFeatures.includes(inputVal)) {
      handleUpdateTier(tierIndex, 'features', [...currentFeatures, inputVal]);
    }

    setNewFeatureInputs((prev) => ({ ...prev, [tierIndex]: '' }));
  };

  const handleRemoveFeature = (tierIndex: number, featureIndex: number) => {
    const currentFeatures = tiers[tierIndex].features || [];
    const updated = currentFeatures.filter((_, i) => i !== featureIndex);
    handleUpdateTier(tierIndex, 'features', updated);
  };

  const getTierErrors = (tier: TicketTierInput) => {
    const errors: string[] = [];
    if (!tier.name.trim()) errors.push('Name is required');
    if (Number(tier.price) <= 0) errors.push('Price must be greater than 0');
    if (Number(tier.stock) < 0) errors.push('Stock cannot be negative');
    if (tier.start_date_time && tier.end_date_time) {
      if (new Date(tier.end_date_time) <= new Date(tier.start_date_time)) {
        errors.push('Sales end date must be after start date');
      }
    }
    return errors;
  };

  return (
    <div className="space-y-4 border border-mono-dark-grey p-4 md:p-6 bg-black/40">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-mono-dark-grey pb-4">
        <div>
          <h3 className="font-bold uppercase text-lg text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-white" /> Ticket Tiers & Perks Configuration *
          </h3>
          <p className="text-xs text-mono-light-grey uppercase tracking-widest mt-1">
            Configure up to {maxTiers} custom ticket categories, seat modes, and perks
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddTier}
          disabled={tiers.length >= maxTiers}
          className="self-start sm:self-auto px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-mono-light-grey disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Ticket Tier ({tiers.length}/{maxTiers})
        </button>
      </div>

      {tiers.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-mono-dark-grey text-mono-light-grey text-xs uppercase">
          No custom ticket tiers added. Click &quot;Add Ticket Tier&quot; to configure pricing, seat mode, and perks.
        </div>
      ) : (
        <div className="space-y-6">
          {tiers.map((tier, index) => {
            const errors = getTierErrors(tier);
            const isSeated = tier.is_seated ?? false;

            return (
              <div
                key={tier.id || index}
                className="p-4 border border-mono-dark-grey bg-black relative space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mono-dark-grey pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Tier #{index + 1}: {tier.name || 'Unnamed Tier'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateTier(index, 'is_seated', !isSeated)}
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors border ${
                        isSeated
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-white/10 text-white border-mono-dark-grey'
                      }`}
                    >
                      {isSeated ? (
                        <>
                          <Armchair className="w-3 h-3" /> Seated (Pilih Kursi)
                        </>
                      ) : (
                        <>
                          <Users className="w-3 h-3" /> Standing (General Admission)
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveTier(index)}
                    className="p-1.5 text-red-500 hover:text-white hover:bg-red-600 transition-colors"
                    aria-label={`Remove tier ${tier.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {errors.length > 0 && (
                  <div className="p-3 bg-red-600/10 border border-red-600/50 text-red-400 text-xs space-y-1">
                    {errors.map((err, errIdx) => (
                      <div key={errIdx} className="flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tier Name */}
                  <div>
                    <label className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1">
                      Tier Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={tier.name}
                      onChange={(e) => handleUpdateTier(index, 'name', e.target.value)}
                      placeholder="e.g. VIP Early Bird"
                      className="w-full bg-black border border-white text-white px-3 py-2 text-sm focus:outline-none focus:border-white/50"
                    />
                  </div>

                  {/* Tier Price */}
                  <div>
                    <label className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1">
                      Price ({currency}) *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={formatNumberWithDots(tier.price)}
                      onChange={(e) =>
                        handleUpdateTier(
                          index,
                          'price',
                          parseDotsToNumber(e.target.value)
                        )
                      }
                      placeholder="150.000"
                      className="w-full bg-black border border-white text-white px-3 py-2 text-sm focus:outline-none focus:border-white/50"
                    />
                  </div>

                  {/* Available Stock */}
                  <div>
                    <label className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1">
                      Stock / Quota *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={tier.stock === 0 ? '' : tier.stock}
                      onChange={(e) =>
                        handleUpdateTier(
                          index,
                          'stock',
                          e.target.value === '' ? 0 : Number(e.target.value)
                        )
                      }
                      className="w-full bg-black border border-white text-white px-3 py-2 text-sm focus:outline-none focus:border-white/50"
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1">
                      Sales Start Date *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={tier.start_date_time}
                      onChange={(e) => handleUpdateTier(index, 'start_date_time', e.target.value)}
                      className="w-full bg-black border border-white text-white px-3 py-2 text-sm focus:outline-none focus:border-white/50"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1">
                      Sales End Date *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={tier.end_date_time}
                      onChange={(e) => handleUpdateTier(index, 'end_date_time', e.target.value)}
                      className="w-full bg-black border border-white text-white px-3 py-2 text-sm focus:outline-none focus:border-white/50"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={tier.description || ''}
                      onChange={(e) => handleUpdateTier(index, 'description', e.target.value)}
                      placeholder="e.g. Best view of the main stage"
                      className="w-full bg-black border border-white text-white px-3 py-2 text-sm focus:outline-none focus:border-white/50"
                    />
                  </div>

                  {/* Features & Perks Multi-Tag Input */}
                  <div className="md:col-span-3 border-t border-mono-dark-grey/50 pt-3">
                    <label className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1">
                      Perks & Facilities (Features)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(tier.features || []).map((feat, fIdx) => (
                        <span
                          key={fIdx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-mono-dark-grey text-white text-xs border border-mono-light-grey/30"
                        >
                          <span>{feat}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFeature(index, fIdx)}
                            className="text-mono-light-grey hover:text-red-400"
                            aria-label={`Remove perk ${feat}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newFeatureInputs[index] || ''}
                        onChange={(e) =>
                          setNewFeatureInputs((prev) => ({ ...prev, [index]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddFeature(index);
                          }
                        }}
                        placeholder="Type a perk (e.g. VIP Lounge, Free Drink) and press Enter or Add"
                        className="flex-1 bg-black border border-white/60 text-white px-3 py-1.5 text-xs focus:outline-none focus:border-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddFeature(index)}
                        className="px-3 py-1.5 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-mono-light-grey"
                      >
                        + Add Perk
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
