'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, UploadCloud, Loader2, Search, ImageOff, Check } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { AdminMedia } from '@/types/media';

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: AdminMedia) => void;
  /** Currently selected media id, to highlight it in the grid. */
  selectedId?: string | null;
}

/**
 * Reusable media library modal: browse, search, upload, and pick an asset.
 * Used by the Pages editor (OG image) and any future content forms.
 */
export function MediaPicker({ open, onClose, onSelect, selectedId }: MediaPickerProps) {
  const [items, setItems] = useState<AdminMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.listMedia({ search: search || undefined, limit: 60 });
      setItems(res?.items ?? []);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const created = await apiClient.uploadMedia(file);
      // Prepend and auto-select the freshly uploaded asset.
      setItems((prev) => [created, ...prev]);
      onSelect(created);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-black border border-white w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Media library"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-mono-dark-grey gap-3">
          <h2 className="font-display font-bold text-lg uppercase text-white">Media Library</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-3 py-2 bg-white text-black text-xs font-bold uppercase border border-white hover:bg-transparent hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              Upload
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
            <button onClick={onClose} aria-label="Close" className="p-1 hover:bg-white/10">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-mono-dark-grey">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search media..."
              aria-label="Search media"
              className="w-full bg-black border border-mono-dark-grey focus:border-white text-white pl-9 pr-3 py-2 text-sm outline-none transition-colors"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="p-4 overflow-y-auto flex-1">
          {error && (
            <div className="border border-red-500/50 bg-red-500/5 p-3 mb-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-mono-light-grey">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-mono-light-grey">
              <ImageOff className="w-10 h-10 mx-auto mb-3 text-mono-dark-grey" />
              <p className="text-sm uppercase tracking-widest">No media yet — upload one above</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {items.map((m) => {
                const isSelected = m.id === selectedId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelect(m)}
                    title={m.original_name}
                    className={`group relative aspect-square border overflow-hidden transition-colors ${
                      isSelected ? 'border-white' : 'border-mono-dark-grey hover:border-white'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.url}
                      alt={m.alt || m.original_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <span className="absolute top-1 right-1 bg-white text-black p-0.5">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-black/70 text-[9px] text-white px-1 py-0.5 truncate">
                      {m.original_name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MediaPicker;
