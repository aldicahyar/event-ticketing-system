'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Mic2, Plus, Edit2, Trash2, Loader2, CheckCircle, AlertCircle,
  ArrowLeft, Search, X, ToggleLeft, ToggleRight, ImagePlus,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaPicker } from '@/components/media/MediaPicker';
import type { Artist, CreateArtistDto, UpdateArtistDto } from '@/types/artist';
import type { Genre } from '@/types/genre';
import type { AdminMedia } from '@/types/media';

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
  genre_id: string;
  origin: string;
  bio: string;
  image_url: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  name: '', code: '', genre_id: '', origin: '', bio: '', image_url: '', is_active: true,
};

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [view, setView] = useState<View>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [codeTouched, setCodeTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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
      const [res, activeGenres] = await Promise.all([
        apiClient.listArtistsAdmin({ search: search || undefined }),
        apiClient.listActiveGenres().catch(() => []),
      ]);
      setArtists(res ?? []);
      setGenres(activeGenres ?? []);
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

  const openEdit = (a: Artist) => {
    setForm({
      name: a.name,
      code: a.code,
      genre_id: a.genre_id ?? '',
      origin: a.origin ?? '',
      bio: a.bio ?? '',
      image_url: a.image_url ?? '',
      is_active: a.is_active,
    });
    setEditingId(a.id);
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

  const pickImage = (media: AdminMedia) => {
    setForm((f) => ({ ...f, image_url: media.url }));
    setPickerOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('error', 'Name is required');
      return;
    }
    setSaving(true);
    try {
      const base = {
        name: form.name,
        code: form.code || undefined,
        genre_id: form.genre_id || undefined,
        origin: form.origin || undefined,
        bio: form.bio || undefined,
        image_url: form.image_url || undefined,
        is_active: form.is_active,
      };
      if (editingId) {
        const dto: UpdateArtistDto = {
          ...base,
          // An empty genre select means "clear the genre".
          genre_id: form.genre_id || null,
          origin: form.origin || null,
          bio: form.bio || null,
          image_url: form.image_url || null,
        };
        await apiClient.updateArtist(editingId, dto);
        showToast('success', `Artist '${form.name}' updated`);
      } else {
        const dto: CreateArtistDto = base;
        await apiClient.createArtist(dto);
        showToast('success', `Artist '${form.name}' created`);
      }
      setView('list');
      await load();
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Artist) => {
    if (!confirm(`Delete artist '${a.name}'? This cannot be undone.`)) return;
    try {
      await apiClient.deleteArtist(a.id);
      showToast('success', `Artist '${a.name}' deleted`);
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
            {editingId ? 'Edit Artist' : 'New Artist'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Name *</label>
            <input value={form.name} onChange={(e) => onNameChange(e.target.value)} required placeholder="Bring Me The Horizon" className="w-full bg-black border border-white text-white px-3 py-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Code</label>
              <input
                value={form.code}
                onChange={(e) => { setCodeTouched(true); setForm({ ...form, code: e.target.value.toUpperCase() }); }}
                placeholder="BRING_ME_THE_HORIZON"
                className="w-full bg-black border border-white text-white px-3 py-2 uppercase"
              />
              <p className="text-[10px] text-[#666] mt-1">Auto-generated from name when left empty</p>
            </div>

            <div>
              <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Genre</label>
              <select
                value={form.genre_id}
                onChange={(e) => setForm({ ...form, genre_id: e.target.value })}
                className="w-full bg-black border border-white text-white px-3 py-2"
              >
                <option value="">— None —</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Origin</label>
            <input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="Sheffield, UK" className="w-full bg-black border border-white text-white px-3 py-2" />
          </div>

          <div>
            <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} placeholder="Short biography (optional)" className="w-full bg-black border border-white text-white px-3 py-2 resize-none" />
          </div>

          <div>
            <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Photo</label>
            <div className="flex items-center gap-3">
              {form.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image_url} alt="Artist photo preview" className="w-24 h-24 object-cover border border-mono-dark-grey" />
              ) : (
                <div className="w-24 h-24 border border-mono-dark-grey flex items-center justify-center text-mono-dark-grey"><ImagePlus className="w-6 h-6" /></div>
              )}
              <button type="button" onClick={() => setPickerOpen(true)} className="px-3 py-2 border border-mono-dark-grey text-[#CCCCCC] hover:border-white hover:text-white text-xs font-bold uppercase">Choose</button>
              {form.image_url && (
                <button type="button" onClick={() => setForm({ ...form, image_url: '' })} className="p-2 border border-mono-dark-grey text-[#CCCCCC] hover:border-red-500 hover:text-red-500" aria-label="Remove photo"><X className="w-4 h-4" /></button>
              )}
            </div>
          </div>

          <button type="button" onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))} aria-pressed={form.is_active}
            className="flex items-center gap-3 border border-mono-dark-grey p-3 w-full hover:border-white transition-colors">
            {form.is_active
              ? <ToggleRight className="w-6 h-6 text-white shrink-0" />
              : <ToggleLeft className="w-6 h-6 text-mono-light-grey shrink-0" />}
            <span className="text-left">
              <span className="block text-xs uppercase tracking-widest font-bold">{form.is_active ? 'Active' : 'Inactive'}</span>
              <span className="block text-[10px] text-mono-light-grey">Inactive artists are hidden from the lineup</span>
            </span>
          </button>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setView('list')} className="px-6 py-3 border border-mono-dark-grey text-[#CCCCCC] font-bold uppercase hover:border-white hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-8 py-3 bg-white text-black font-bold uppercase border-2 border-white hover:bg-transparent hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingId ? 'Update Artist' : 'Create Artist'}
            </button>
          </div>
        </form>

        <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={pickImage} />

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
          Content <span className="text-transparent" style={{ WebkitTextStroke: '2px white' }}>Artists</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
          {'// ARTIST_MASTER_DATA'}
        </p>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
          <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search artists..." aria-label="Search artists"
            className="w-full bg-black border border-mono-dark-grey focus:border-white text-white pl-9 pr-9 py-2 text-sm outline-none transition-colors" />
          {searchInput && (
            <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-mono-light-grey hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border border-white transition-all flex items-center justify-center gap-2 shrink-0">
          <Plus className="w-4 h-4" /> New Artist
        </button>
      </div>

      {/* Header row (table-like) */}
      {!isLoading && !error && artists.length > 0 && (
        <div className="hidden md:grid grid-cols-[150px_1fr_140px_140px_90px_110px] gap-4 px-4 text-[10px] uppercase tracking-widest text-mono-light-grey">
          <span>Code</span>
          <span>Name</span>
          <span>Genre</span>
          <span>Origin</span>
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
          <p className="text-red-400 text-sm uppercase mb-2">Failed to load artists</p>
          <p className="text-mono-light-grey text-sm mb-3">{error}</p>
          <button onClick={load} className="px-4 py-2 bg-white text-black text-xs font-bold uppercase">Retry</button>
        </div>
      )}

      {!isLoading && !error && artists.length === 0 && (
        <div className="border border-mono-dark-grey p-10 text-center">
          <Mic2 className="w-10 h-10 text-mono-dark-grey mx-auto mb-3" aria-hidden="true" />
          <p className="text-mono-light-grey uppercase text-sm tracking-widest">{search ? 'No artist matches your search' : 'No artists yet'}</p>
        </div>
      )}

      {!isLoading && !error && artists.length > 0 && (
        <div className="space-y-2">
          {artists.map((a, idx) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              className="bg-black border border-mono-dark-grey p-4 grid grid-cols-1 md:grid-cols-[150px_1fr_140px_140px_90px_110px] gap-2 md:gap-4 md:items-center">
              <code className="text-[11px] bg-white/10 px-1.5 py-0.5 w-fit text-[#CCCCCC] truncate">{a.code}</code>
              <span className="font-bold uppercase text-white truncate">{a.name}</span>
              <span className="text-xs text-mono-light-grey truncate">{a.genre?.name ?? '—'}</span>
              <span className="text-xs text-mono-light-grey truncate">{a.origin ?? '—'}</span>
              <span className={`text-[10px] px-1.5 py-0.5 font-bold uppercase w-fit ${a.is_active ? 'bg-green-500 text-black' : 'bg-mono-dark-grey text-[#CCCCCC]'}`}>
                {a.is_active ? 'Active' : 'Inactive'}
              </span>
              <div className="flex gap-2 md:justify-end">
                <button onClick={() => openEdit(a)} aria-label={`Edit ${a.name}`} className="p-2 border border-mono-dark-grey hover:border-white text-[#CCCCCC] hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(a)} aria-label={`Delete ${a.name}`} className="p-2 border border-mono-dark-grey hover:border-red-500 text-[#CCCCCC] hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
