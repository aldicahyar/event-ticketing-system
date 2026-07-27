'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Plus, Edit2, Trash2, Loader2, CheckCircle, AlertCircle,
  ArrowLeft, ExternalLink, ImagePlus, X, Search,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { MediaPicker } from '@/components/media/MediaPicker';
import type { CmsPage, PageStatus, CreatePageDto, UpdatePageDto } from '@/types/page';
import type { AdminMedia } from '@/types/media';

type Toast = { type: 'success' | 'error'; msg: string };
type View = 'list' | 'form';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: PageStatus;
  seoTitle: string;
  seoDescription: string;
  ogImageId: string | null;
  ogImageUrl: string | null;
}

const EMPTY_FORM: FormState = {
  title: '', slug: '', excerpt: '', content: '', status: 'DRAFT',
  seoTitle: '', seoDescription: '', ogImageId: null, ogImageUrl: null,
};

const PUBLIC_BASE = process.env.NEXT_PUBLIC_SITE_URL || '';

export default function AdminPagesPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [view, setView] = useState<View>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [slugTouched, setSlugTouched] = useState(false);
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
      const res = await apiClient.listPages({ search: search || undefined, limit: 100 });
      setPages(res?.items ?? []);
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
    setSlugTouched(false);
    setView('form');
  };

  const openEdit = (p: CmsPage) => {
    setForm({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? '',
      content: p.content ?? '',
      status: p.status,
      seoTitle: p.seoTitle ?? '',
      seoDescription: p.seoDescription ?? '',
      ogImageId: p.ogImageId ?? null,
      ogImageUrl: p.ogImage?.url ?? null,
    });
    setEditingId(p.id);
    setSlugTouched(true); // don't auto-rewrite an existing slug
    setView('form');
  };

  const onTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: slugTouched ? f.slug : slugify(title),
    }));
  };

  const pickOgImage = (media: AdminMedia) => {
    setForm((f) => ({ ...f, ogImageId: media.id, ogImageUrl: media.url }));
    setPickerOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) {
      showToast('error', 'Title and slug are required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const dto: UpdatePageDto = {
          title: form.title,
          slug: form.slug,
          excerpt: form.excerpt || undefined,
          content: form.content,
          status: form.status,
          seoTitle: form.seoTitle || undefined,
          seoDescription: form.seoDescription || undefined,
          ogImageId: form.ogImageId, // null clears it
        };
        await apiClient.updatePage(editingId, dto);
        showToast('success', `Page '${form.slug}' updated`);
      } else {
        const dto: CreatePageDto = {
          title: form.title,
          slug: form.slug,
          excerpt: form.excerpt || undefined,
          content: form.content,
          status: form.status,
          seoTitle: form.seoTitle || undefined,
          seoDescription: form.seoDescription || undefined,
          ogImageId: form.ogImageId || undefined,
        };
        await apiClient.createPage(dto);
        showToast('success', `Page '${form.slug}' created`);
      }
      setView('list');
      await load();
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: CmsPage) => {
    if (!confirm(`Delete page '${p.slug}'? This cannot be undone.`)) return;
    try {
      await apiClient.deletePage(p.id);
      showToast('success', `Page '${p.slug}' deleted`);
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
            {editingId ? 'Edit Page' : 'New Page'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Title *</label>
              <input value={form.title} onChange={(e) => onTitleChange(e.target.value)} required className="w-full bg-black border border-white text-white px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Slug *</label>
              <input
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: e.target.value }); }}
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="about"
                className="w-full bg-black border border-white text-white px-3 py-2 lowercase"
              />
              <p className="text-[10px] text-[#666] mt-1">Public URL: /p/{form.slug || 'slug'}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Excerpt</label>
            <input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} maxLength={300} className="w-full bg-black border border-white text-white px-3 py-2" />
          </div>

          <div>
            <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Content</label>
            <RichTextEditor value={form.content} onChange={(html) => setForm((f) => ({ ...f, content: html }))} />
          </div>

          {/* SEO + status */}
          <div className="border border-mono-dark-grey p-4 space-y-4">
            <p className="text-xs text-mono-light-grey uppercase tracking-widest">SEO &amp; Publishing</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PageStatus })} className="w-full bg-black border border-white text-white px-3 py-2">
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">SEO Title</label>
                <input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} maxLength={200} className="w-full bg-black border border-white text-white px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">SEO Description</label>
              <textarea value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} maxLength={300} rows={2} className="w-full bg-black border border-white text-white px-3 py-2 resize-none" />
            </div>
            <div>
              <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Social / OG Image</label>
              <div className="flex items-center gap-3">
                {form.ogImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.ogImageUrl} alt="OG preview" className="w-24 h-16 object-cover border border-mono-dark-grey" />
                ) : (
                  <div className="w-24 h-16 border border-mono-dark-grey flex items-center justify-center text-mono-dark-grey"><ImagePlus className="w-5 h-5" /></div>
                )}
                <button type="button" onClick={() => setPickerOpen(true)} className="px-3 py-2 border border-mono-dark-grey text-[#CCCCCC] hover:border-white hover:text-white text-xs font-bold uppercase">Choose</button>
                {form.ogImageId && (
                  <button type="button" onClick={() => setForm({ ...form, ogImageId: null, ogImageUrl: null })} className="p-2 border border-mono-dark-grey text-[#CCCCCC] hover:border-red-500 hover:text-red-500" aria-label="Remove OG image"><X className="w-4 h-4" /></button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setView('list')} className="px-6 py-3 border border-mono-dark-grey text-[#CCCCCC] font-bold uppercase hover:border-white hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-8 py-3 bg-white text-black font-bold uppercase border-2 border-white hover:bg-transparent hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingId ? 'Update Page' : 'Create Page'}
            </button>
          </div>
        </form>

        <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={pickOgImage} selectedId={form.ogImageId} />

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
          Content <span className="text-transparent" style={{ WebkitTextStroke: '2px white' }}>Pages</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
          {'// EDITABLE_STATIC_PAGES'}
        </p>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
          <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search pages..." aria-label="Search pages"
            className="w-full bg-black border border-mono-dark-grey focus:border-white text-white pl-9 pr-3 py-2 text-sm outline-none transition-colors" />
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border border-white transition-all flex items-center justify-center gap-2 shrink-0">
          <Plus className="w-4 h-4" /> New Page
        </button>
      </div>

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
          <p className="text-red-400 text-sm uppercase mb-2">Failed to load pages</p>
          <p className="text-mono-light-grey text-sm mb-3">{error}</p>
          <button onClick={load} className="px-4 py-2 bg-white text-black text-xs font-bold uppercase">Retry</button>
        </div>
      )}

      {!isLoading && !error && pages.length === 0 && (
        <div className="border border-mono-dark-grey p-10 text-center">
          <FileText className="w-10 h-10 text-mono-dark-grey mx-auto mb-3" aria-hidden="true" />
          <p className="text-mono-light-grey uppercase text-sm tracking-widest">{search ? 'No page matches your search' : 'No pages yet'}</p>
        </div>
      )}

      {!isLoading && !error && pages.length > 0 && (
        <div className="space-y-2">
          {pages.map((p, idx) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              className="bg-black border border-mono-dark-grey p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold uppercase text-white truncate">{p.title}</span>
                  <code className="text-[10px] bg-white/10 px-1.5 py-0.5">/p/{p.slug}</code>
                  <span className={`text-[10px] px-1.5 py-0.5 font-bold uppercase ${p.status === 'PUBLISHED' ? 'bg-white text-black' : 'bg-mono-dark-grey text-[#CCCCCC]'}`}>
                    {p.status}
                  </span>
                </div>
                {p.excerpt && <p className="text-xs text-mono-light-grey mt-1 truncate">{p.excerpt}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                {p.status === 'PUBLISHED' && (
                  <a href={`${PUBLIC_BASE}/p/${p.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${p.slug}`}
                    className="p-2 border border-mono-dark-grey hover:border-white text-[#CCCCCC] hover:text-white transition-colors"><ExternalLink className="w-4 h-4" /></a>
                )}
                <button onClick={() => openEdit(p)} aria-label={`Edit ${p.slug}`} className="p-2 border border-mono-dark-grey hover:border-white text-[#CCCCCC] hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(p)} aria-label={`Delete ${p.slug}`} className="p-2 border border-mono-dark-grey hover:border-red-500 text-[#CCCCCC] hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
