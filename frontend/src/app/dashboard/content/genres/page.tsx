'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Music, Plus, Edit2, Trash2, Loader2, CheckCircle, AlertCircle,
  ArrowLeft, Search, X, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import type { Genre, CreateGenreDto, UpdateGenreDto } from '@/types/genre';

type Toast = { type: 'success' | 'error'; msg: string };
type View = 'list' | 'form';

const codify = (s: string) =>
  s
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

interface FormState {
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = { name: '', code: '', description: '', is_active: true };

export default function AdminGenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [view, setView] = useState<View>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [codeTouched, setCodeTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((type: Toast['type'], msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.listGenresAdmin({ search: search || undefined });
      setGenres(res ?? []);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setCodeTouched(false);
    setView('form');
  };

  const openEdit = (g: Genre) => {
    setForm({
      name: g.name,
      code: g.code,
      description: g.description ?? '',
      is_active: g.is_active,
    });
    setEditingId(g.id);
    setCodeTouched(true); // don't auto-rewrite an existing code
    setView('form');
  };

  const onNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      code: codeTouched ? f.code : codify(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('error', 'Name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const dto: UpdateGenreDto = {
          name: form.name,
          code: form.code || undefined,
          description: form.description || undefined,
          is_active: form.is_active,
        };
        await apiClient.updateGenre(editingId, dto);
        showToast('success', `Genre '${form.name}' updated`);
      } else {
        const dto: CreateGenreDto = {
          name: form.name,
          code: form.code || undefined,
          description: form.description || undefined,
          is_active: form.is_active,
        };
        await apiClient.createGenre(dto);
        showToast('success', `Genre '${form.name}' created`);
      }
      setView('list');
      await load();
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (g: Genre) => {
    if (!confirm(`Delete genre '${g.name}'? This cannot be undone.`)) return;
    try {
      await apiClient.deleteGenre(g.id);
      showToast('success', `Genre '${g.name}' deleted`);
      await load();
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    }
  };

  // ---------------- FORM VIEW ----------------
  if (view === 'form') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setView('list')} aria-label="Back to list" className="p-2 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-2xl md:text-3xl uppercase text-white">
            {editingId ? 'Edit Genre' : 'New Genre'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Name *</label>
            <input value={form.name} onChange={(e) => onNameChange(e.target.value)} required placeholder="House Music" className="w-full bg-black border border-white text-white px-3 py-2" />
          </div>

          <div>
            <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Code</label>
            <input
              value={form.code}
              onChange={(e) => { setCodeTouched(true); setForm({ ...form, code: e.target.value.toUpperCase() }); }}
              placeholder="HOUSE_MUSIC"
              className="w-full bg-black border border-white text-white px-3 py-2 uppercase"
            />
            <p className="text-[10px] text-[#666] mt-1">Auto-generated from name when left empty</p>
          </div>

          <div>
            <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Short description (optional)" className="w-full bg-black border border-white text-white px-3 py-2 resize-none" />
          </div>

          <button type="button" onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))} aria-pressed={form.is_active}
            className="flex items-center gap-3 border border-mono-dark-grey p-3 w-full hover:border-white transition-colors">
            {form.is_active
              ? <ToggleRight className="w-6 h-6 text-white shrink-0" />
              : <ToggleLeft className="w-6 h-6 text-mono-light-grey shrink-0" />}
            <span className="text-left">
              <span className="block text-xs uppercase tracking-widest font-bold">{form.is_active ? 'Active' : 'Inactive'}</span>
              <span className="block text-[10px] text-mono-light-grey">Inactive genres are hidden from shoppers</span>
            </span>
          </button>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setView('list')} className="px-6 py-3 border border-mono-dark-grey text-[#CCCCCC] font-bold uppercase hover:border-white hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-8 py-3 bg-white text-black font-bold uppercase border-2 border-white hover:bg-transparent hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingId ? 'Update Genre' : 'Create Genre'}
            </button>
          </div>
        </form>

        {toast && (
          <div className={`fixed bottom-4 right-4 z-50 p-4 border max-w-sm flex items-start gap-3 ${toast.type === 'success' ? 'bg-white text-black border-white' : 'bg-red-500/20 text-red-300 border-red-500'}`} role="status" aria-live="polite">
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm">{toast.msg}</span>
          </div>
        )}
      </div>
    );
  }

  // ---------------- LIST VIEW ----------------
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-bold text-2xl md:text-4xl uppercase text-white mb-2">
          Content <span className="text-transparent" style={{ WebkitTextStroke: '2px white' }}>Genres</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
          {'// MUSIC_GENRE_MASTER_DATA'}
        </p>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
          <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search genres..." aria-label="Search genres"
            className="w-full bg-black border border-mono-dark-grey focus:border-white text-white pl-9 pr-9 py-2 text-sm outline-none transition-colors" />
          {searchInput && (
            <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-mono-light-grey hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border border-white transition-all flex items-center justify-center gap-2 shrink-0">
          <Plus className="w-4 h-4" /> New Genre
        </button>
      </div>

      {/* Header row (table-like) */}
      {!isLoading && !error && genres.length > 0 && (
        <div className="hidden md:grid grid-cols-[140px_1fr_2fr_100px_110px] gap-4 px-4 text-[10px] uppercase tracking-widest text-mono-light-grey">
          <span>Code</span>
          <span>Name</span>
          <span>Description</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-black border border-mono-dark-grey p-4 flex items-center justify-between">
              <div className="space-y-2"><Skeleton className="h-3 w-40" /><Skeleton className="h-2 w-24" /></div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="border border-red-500/50 bg-red-500/5 p-4">
          <p className="text-red-400 text-sm uppercase mb-2">Failed to load genres</p>
          <p className="text-mono-light-grey text-sm mb-3">{error}</p>
          <button onClick={load} className="px-4 py-2 bg-white text-black text-xs font-bold uppercase">Retry</button>
        </div>
      )}

      {!isLoading && !error && genres.length === 0 && (
        <div className="border border-mono-dark-grey p-10 text-center">
          <Music className="w-10 h-10 text-mono-dark-grey mx-auto mb-3" aria-hidden="true" />
          <p className="text-mono-light-grey uppercase text-sm tracking-widest">{search ? 'No genre matches your search' : 'No genres yet'}</p>
        </div>
      )}

      {!isLoading && !error && genres.length > 0 && (
        <div className="space-y-2">
          {genres.map((g, idx) => (
            <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              className="bg-black border border-mono-dark-grey p-4 grid grid-cols-1 md:grid-cols-[140px_1fr_2fr_100px_110px] gap-2 md:gap-4 md:items-center">
              <code className="text-[11px] bg-white/10 px-1.5 py-0.5 w-fit text-[#CCCCCC]">{g.code}</code>
              <span className="font-bold uppercase text-white truncate">{g.name}</span>
              <span className="text-xs text-mono-light-grey truncate">{g.description ?? '—'}</span>
              <span className={`text-[10px] px-1.5 py-0.5 font-bold uppercase w-fit ${g.is_active ? 'bg-green-500 text-black' : 'bg-mono-dark-grey text-[#CCCCCC]'}`}>
                {g.is_active ? 'Active' : 'Inactive'}
              </span>
              <div className="flex gap-2 md:justify-end">
                <button onClick={() => openEdit(g)} aria-label={`Edit ${g.name}`} className="p-2 border border-mono-dark-grey hover:border-white text-[#CCCCCC] hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(g)} aria-label={`Delete ${g.name}`} className="p-2 border border-mono-dark-grey hover:border-red-500 text-[#CCCCCC] hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 border max-w-sm flex items-start gap-3 ${toast.type === 'success' ? 'bg-white text-black border-white' : 'bg-red-500/20 text-red-300 border-red-500'}`} role="status" aria-live="polite">
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
