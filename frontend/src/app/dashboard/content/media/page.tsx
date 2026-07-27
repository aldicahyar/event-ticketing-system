'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Image as ImageIcon, UploadCloud, Trash2, Loader2, Search, X,
  CheckCircle, AlertCircle, Copy, ChevronLeft, ChevronRight, Pencil,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminMedia, MediaListMeta } from '@/types/media';

type Toast = { type: 'success' | 'error'; msg: string };
const PAGE_SIZE = 24;

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

export default function AdminMediaPage() {
  const [items, setItems] = useState<AdminMedia[]>([]);
  const [meta, setMeta] = useState<MediaListMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminMedia | null>(null);
  const [altDraft, setAltDraft] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((type: Toast['type'], msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.listMedia({ search: search || undefined, page, limit: PAGE_SIZE });
      setItems(res?.items ?? []);
      setMeta(res?.meta ?? null);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      // Upload sequentially so one failure doesn't abort the rest.
      for (const file of Array.from(files)) {
        await apiClient.uploadMedia(file);
      }
      showToast('success', `${files.length} file(s) uploaded`);
      setPage(1);
      await load();
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (m: AdminMedia) => {
    if (!confirm(`Delete '${m.originalName}'? This removes the file permanently.`)) return;
    setBusyId(m.id);
    try {
      await apiClient.deleteMedia(m.id);
      showToast('success', 'Media deleted');
      await load();
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const copyUrl = async (m: AdminMedia) => {
    const full = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${m.url}`;
    try {
      await navigator.clipboard.writeText(full);
      showToast('success', 'URL copied to clipboard');
    } catch {
      showToast('error', 'Could not copy URL');
    }
  };

  const openEdit = (m: AdminMedia) => {
    setEditing(m);
    setAltDraft(m.alt || '');
  };

  const saveAlt = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    try {
      await apiClient.updateMedia(editing.id, { alt: altDraft });
      showToast('success', 'Alt text updated');
      setEditing(null);
      await load();
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-bold text-2xl md:text-4xl uppercase text-white mb-2">
          Media <span className="text-transparent" style={{ WebkitTextStroke: '2px white' }}>Library</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
          {'// UPLOAD_AND_MANAGE_ASSETS'}
        </p>
      </motion.div>

      {/* Action bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or alt text..."
            aria-label="Search media"
            className="w-full bg-black border border-mono-dark-grey focus:border-white text-white pl-9 pr-3 py-2 text-sm outline-none transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border border-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          Upload
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
      </div>

      {!isLoading && !error && meta && (
        <p className="text-xs text-mono-light-grey uppercase tracking-widest">
          {meta.total} asset{meta.total !== 1 ? 's' : ''}
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" aria-busy="true">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="border border-red-500/50 bg-red-500/5 p-4">
          <p className="text-red-400 text-sm uppercase mb-2">Failed to load media</p>
          <p className="text-mono-light-grey text-sm mb-3">{error}</p>
          <button onClick={load} className="px-4 py-2 bg-white text-black text-xs font-bold uppercase">Retry</button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && items.length === 0 && (
        <div className="border border-mono-dark-grey p-10 text-center">
          <ImageIcon className="w-10 h-10 text-mono-dark-grey mx-auto mb-3" aria-hidden="true" />
          <p className="text-mono-light-grey uppercase text-sm tracking-widest">
            {search ? 'No media matches your search' : 'No media yet — upload your first asset'}
          </p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((m) => (
            <div key={m.id} className="bg-black border border-mono-dark-grey group">
              <div className="relative aspect-square overflow-hidden bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.alt || m.originalName} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button type="button" onClick={() => copyUrl(m)} aria-label={`Copy URL for ${m.originalName}`} className="p-2 bg-white text-black hover:bg-[#CCCCCC]"><Copy className="w-4 h-4" /></button>
                  <button type="button" onClick={() => openEdit(m)} aria-label={`Edit ${m.originalName}`} className="p-2 bg-white text-black hover:bg-[#CCCCCC]"><Pencil className="w-4 h-4" /></button>
                  <button type="button" onClick={() => handleDelete(m)} disabled={busyId === m.id} aria-label={`Delete ${m.originalName}`} className="p-2 bg-red-600 text-white hover:bg-red-500 disabled:opacity-50">
                    {busyId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs text-white truncate" title={m.originalName}>{m.originalName}</p>
                <p className="text-[10px] text-mono-light-grey uppercase mt-0.5">{formatBytes(m.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!meta.hasPrev}
            className="px-3 py-2 border border-mono-dark-grey text-[#CCCCCC] hover:border-white hover:text-white text-xs font-bold uppercase transition-colors disabled:opacity-30 flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-xs text-mono-light-grey uppercase tracking-widest">Page {meta.page} / {meta.totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={!meta.hasNext}
            className="px-3 py-2 border border-mono-dark-grey text-[#CCCCCC] hover:border-white hover:text-white text-xs font-bold uppercase transition-colors disabled:opacity-30 flex items-center gap-2">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Edit alt modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)} role="presentation">
          <div className="bg-black border border-white max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit media">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display font-bold text-lg uppercase text-white">Edit Alt Text</h2>
              <button onClick={() => setEditing(null)} aria-label="Close" className="p-1 hover:bg-white/10"><X className="w-5 h-5 text-white" /></button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={editing.url} alt={editing.alt || editing.originalName} className="w-full h-32 object-contain bg-white/5 border border-mono-dark-grey mb-4" />
            <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Alt text (accessibility / SEO)</label>
            <input value={altDraft} onChange={(e) => setAltDraft(e.target.value)} className="w-full bg-black border border-white text-white px-3 py-2 mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="flex-1 px-4 py-2 border border-mono-dark-grey text-[#CCCCCC] hover:border-white hover:text-white uppercase text-xs font-bold">Cancel</button>
              <button onClick={saveAlt} disabled={busyId === editing.id} className="flex-1 px-4 py-2 bg-white text-black border border-white hover:bg-transparent hover:text-white uppercase text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {busyId === editing.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 border max-w-sm flex items-start gap-3 ${toast.type === 'success' ? 'bg-white text-black border-white' : 'bg-red-500/20 text-red-300 border-red-500'}`} role="status" aria-live="polite">
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
