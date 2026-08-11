'use client';

import React from 'react';
import { Plus, Trash2, Tag, AlertCircle } from 'lucide-react';

export interface TicketTierInput {
  id?: string;
  name: string;
  price: number;
  stock: number;
  description?: string;
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
  maxTiers = 5,
  defaultSalesStart,
  defaultSalesEnd,
}: TicketTiersEditorProps) {
  const handleAddTier = () => {
    if (tiers.length >= maxTiers) return;
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const newTier: TicketTierInput = {
      name: tiers.length === 0 ? 'Regular' : tiers.length === 1 ? 'VIP' : `Tier ${tiers.length + 1}`,
      price: 150000,
      stock: 100,
      description: '',
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
            <Tag className="w-5 h-5 text-white" /> Ticket Tiers Configuration *
          </h3>
          <p className="text-xs text-mono-light-grey uppercase tracking-widest mt-1">
            Configure up to {maxTiers} custom ticket tiers (VIP, Presale, Regular, etc.)
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
          No custom ticket tiers added. Click &quot;Add Ticket Tier&quot; to configure pricing and stock tiers.
        </div>
      ) : (
        <div className="space-y-6">
          {tiers.map((tier, index) => {
            const errors = getTierErrors(tier);
            return (
              <div
                key={tier.id || index}
                className="p-4 border border-mono-dark-grey bg-black relative space-y-4"
              >
                <div className="flex items-center justify-between border-b border-mono-dark-grey pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Tier #{index + 1}: {tier.name || 'Unnamed Tier'}
                  </span>
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
                      type="number"
                      required
                      min="1"
                      value={tier.price === 0 ? '' : tier.price}
                      onChange={(e) => handleUpdateTier(index, 'price', e.target.value === '' ? 0 : Number(e.target.value))}
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
                      onChange={(e) => handleUpdateTier(index, 'stock', e.target.value === '' ? 0 : Number(e.target.value))}
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
                  <div className="md:col-span-3">
                    <label className="block text-[10px] text-mono-light-grey uppercase tracking-widest mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={tier.description || ''}
                      onChange={(e) => handleUpdateTier(index, 'description', e.target.value)}
                      placeholder="e.g. Free merchandise & fast-track entry"
                      className="w-full bg-black border border-white text-white px-3 py-2 text-sm focus:outline-none focus:border-white/50"
                    />
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
