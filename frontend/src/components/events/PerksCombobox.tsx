'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X, AlertCircle, Check, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

/** Master data item from GET /settings/perks (t_mtr_perks). */
export interface PerkItem {
  id: string;
  label: string;
  type: 'PERK' | 'FACILITY';
  status: 'ACTIVE' | 'NON_ACTIVE';
}

type RawPerk = Partial<Omit<PerkItem, 'status'>> & {
  is_active?: boolean;
  category?: string;
  name?: string;
};

/**
 * Accepts any reasonable backend shape:
 *  - flat array of items ({ label, type, status, ... })
 *  - array of label strings
 *  - grouped object { PERK: [...], FACILITY: [...] } / { perks: [...], facilities: [...] }
 * and returns a flat, deduped PerkItem[].
 */
export function normalizePerkList(res: unknown): PerkItem[] {
  const seen = new Set<string>();
  const out: PerkItem[] = [];

  const pushItem = (item: unknown, fallbackType: 'PERK' | 'FACILITY' = 'PERK') => {
    // GET /settings/perks/active groups labels as plain strings.
    if (typeof item === 'string') item = { label: item, type: fallbackType };
    if (!item || typeof item !== 'object') return;
    const raw = item as RawPerk;
    const label = String(raw.label ?? raw.name ?? '').trim();
    if (!label || seen.has(label.toLowerCase())) return;
    seen.add(label.toLowerCase());
    const isActive = typeof raw.is_active === 'boolean'
      ? raw.is_active
      : String((raw as Record<string, unknown>).status ?? 'ACTIVE').toUpperCase() !== 'NON_ACTIVE';
    out.push({
      id: String(raw.id ?? label),
      label,
      type: String(raw.type ?? raw.category ?? fallbackType).toUpperCase() === 'FACILITY'
        ? 'FACILITY'
        : 'PERK',
      status: isActive ? 'ACTIVE' : 'NON_ACTIVE',
    });
  };

  if (Array.isArray(res)) {
    for (const item of res) pushItem(item);
  } else if (res && typeof res === 'object') {
    const obj = res as Record<string, unknown>;
    const groups: Array<[string, 'PERK' | 'FACILITY']> = [
      ['PERK', 'PERK'],
      ['perks', 'PERK'],
      ['FACILITY', 'FACILITY'],
      ['facilities', 'FACILITY'],
    ];
    for (const [key, type] of groups) {
      if (Array.isArray(obj[key])) for (const item of obj[key]) pushItem(item, type);
    }
  }
  return out;
}

// Module-level cache so N tier rows share one GET /settings/perks request.
let perksCache: PerkItem[] | null = null;
let perksPromise: Promise<PerkItem[]> | null = null;

export function fetchActivePerks(force = false): Promise<PerkItem[]> {
  if (force) { perksCache = null; perksPromise = null; }
  if (perksCache) return Promise.resolve(perksCache);
  if (!perksPromise) {
    perksPromise = apiClient
      // Public endpoint (no TIER_SETTINGS permission) so ORGANIZERS can load it in the event form.
      .get('/settings/perks/active')
      .then((res) => {
        perksCache = normalizePerkList(res).filter((p) => p.status === 'ACTIVE');
        return perksCache;
      })
      .catch((err) => {
        perksPromise = null;
        throw err;
      });
  }
  return perksPromise;
}

interface PerksComboboxProps {
  /** Selected perk names (stored as tier features). */
  value: string[];
  onChange: (names: string[]) => void;
}

export function PerksCombobox({ value, onChange }: PerksComboboxProps) {
  const listboxId = useId();
  const [options, setOptions] = useState<PerkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback((force = false) => {
    setLoading(true);
    setLoadError('');
    fetchActivePerks(force)
      .then(setOptions)
      .catch((err) => {
        setLoadError(apiClient.getErrorMessage(err));
        setOpen(true); // keep dropdown open so the Retry button stays reachable
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectedSet = useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter(
      (o) => !selectedSet.has(o.label.toLowerCase()) &&
        (!q || o.label.toLowerCase().includes(q))
    );
  }, [options, query, selectedSet]);

  const grouped = useMemo(() => {
    const byType = new Map<string, PerkItem[]>();
    for (const item of filtered) {
      const list = byType.get(item.type) ?? [];
      list.push(item);
      byType.set(item.type, list);
    }
    return (['PERK', 'FACILITY'] as const)
      .filter((t) => byType.has(t))
      .map((t) => ({ type: t, items: byType.get(t)! }));
  }, [filtered]);

  const flatFiltered = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  useEffect(() => {
    if (activeIdx >= flatFiltered.length) setActiveIdx(0);
  }, [flatFiltered.length, activeIdx]);

  const toggle = (label: string) => {
    if (value.includes(label)) {
      onChange(value.filter((v) => v !== label));
    } else {
      onChange([...value, label]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActiveIdx((i) => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (!open || flatFiltered.length === 0) return;
      e.preventDefault();
      toggle(flatFiltered[activeIdx].label);
      inputRef.current?.focus();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((name) => {
            const meta = options.find((o) => o.label === name);
            return (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-mono-dark-grey text-white text-xs border border-mono-light-grey/30"
              >
                <span>{name}</span>
                {meta && (
                  <span className="text-[9px] uppercase tracking-wider text-mono-light-grey">
                    [{meta.type}]
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => toggle(name)}
                  className="text-mono-light-grey hover:text-red-400"
                  aria-label={`Remove ${name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Trigger input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mono-light-grey pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && flatFiltered[activeIdx] ? `${listboxId}-opt-${activeIdx}` : undefined}
          value={query}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIdx(0); }}
          onKeyDown={handleKeyDown}
          placeholder={loading ? 'Loading perks...' : 'Search perks / facilities (select from list only)'}
          disabled={loading || !!loadError}
          className="w-full bg-black border border-white/60 text-white pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-white disabled:opacity-60"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mono-light-grey animate-spin" />
        )}
      </div>

      {/* Outside-click closer */}
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-black border border-white max-h-60 overflow-y-auto">
          {loadError ? (
            <div className="p-3 text-xs text-red-400 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{loadError}</span>
              <button
                type="button"
                onClick={() => load(true)}
                className="px-2 py-1 border border-white/40 text-white text-[10px] font-bold uppercase hover:bg-white hover:text-black"
              >
                Retry
              </button>
            </div>
          ) : flatFiltered.length === 0 ? (
            <div className="p-3 text-xs text-mono-light-grey uppercase">
              {options.length === 0
                ? 'No active perks available.'
                : 'No matching items. Only existing active items can be selected.'}
            </div>
          ) : (
            <ul id={listboxId} role="listbox" aria-label="Perks and facilities">
              {grouped.map((group) => (
                <React.Fragment key={group.type}>
                  <li
                    role="presentation"
                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-mono-light-grey bg-mono-dark-grey/30 border-b border-mono-dark-grey sticky top-0"
                  >
                    {group.type === 'PERK' ? '// PERKS' : '// FACILITIES'}
                  </li>
                  {group.items.map((item) => {
                    const idx = flatFiltered.indexOf(item);
                    const isActive = idx === activeIdx;
                    return (
                      <li
                        key={item.id}
                        id={`${listboxId}-opt-${idx}`}
                        role="option"
                        aria-selected={false}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => toggle(item.label)}
                        className={`px-3 py-2 text-xs text-white cursor-pointer border-b border-mono-dark-grey/50 flex items-center justify-between gap-2 ${
                          isActive ? 'bg-white text-black' : 'hover:bg-white/10'
                        }`}
                      >
                        <span className="font-bold">{item.label}</span>
                        {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </li>
                    );
                  })}
                </React.Fragment>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
