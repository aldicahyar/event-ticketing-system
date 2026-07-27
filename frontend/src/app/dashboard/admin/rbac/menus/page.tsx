'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu as MenuIcon, Plus, Edit2, Trash2, Loader2, CheckCircle, AlertCircle, X, ChevronRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getIcon, listIconNames } from '@/lib/icon-registry';
import { Skeleton } from '@/components/ui/skeleton';
import type { Menu, CreateMenuDto } from '@/types/rbac';

interface MenuNode extends Menu {
  children: MenuNode[];
}

export default function AdminMenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [form, setForm] = useState<CreateMenuDto & { is_active?: boolean }>({
    code: '', name: '', name_en: '', parent_code: '', icon: '', slug: '', order: 0, is_new_tab: false,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.listMenus();
      setMenus(data ?? []);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const buildTree = (flat: Menu[]): MenuNode[] => {
    const sorted = [...flat].sort((a, b) => a.order - b.order);
    const byCode = new Map<string, MenuNode>();
    for (const m of sorted) byCode.set(m.code, { ...m, children: [] });
    const roots: MenuNode[] = [];
    for (const node of byCode.values()) {
      if (node.parent_code && byCode.has(node.parent_code)) {
        byCode.get(node.parent_code)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  };

  const tree = buildTree(menus);
  const rootMenus = menus.filter((m) => !m.parent_code);

  const openCreate = (parent_code?: string) => {
    setForm({
      code: '', name: '', name_en: '', parent_code: parent_code || '',
      icon: 'CircleDot', slug: '', order: 0, is_new_tab: false,
    });
    setEditingMenu(null);
    setModalMode('create');
  };

  const openEdit = (menu: Menu) => {
    setForm({
      code: menu.code,
      name: menu.name,
      name_en: menu.name_en ?? '',
      parent_code: menu.parent_code ?? '',
      icon: menu.icon ?? 'CircleDot',
      slug: menu.slug ?? '',
      order: menu.order,
      is_new_tab: menu.is_new_tab,
      is_active: menu.is_active,
    });
    setEditingMenu(menu);
    setModalMode('edit');
  };

  const closeModal = () => { setModalMode(null); setEditingMenu(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        name_en: form.name_en || undefined,
        parent_code: form.parent_code || null,
        icon: form.icon || undefined,
        slug: form.slug || undefined,
      };
      if (modalMode === 'create') {
        await apiClient.createMenu(payload);
        showToast('success', `Menu '${form.code}' created`);
      } else if (modalMode === 'edit' && editingMenu) {
        const { code: _omit, ...update } = payload;
        await apiClient.updateMenu(editingMenu.code, update);
        showToast('success', `Menu '${editingMenu.code}' updated`);
      }
      closeModal();
      await load();
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (menu: Menu) => {
    if (!confirm(`Deactivate menu '${menu.code}' and all its children?`)) return;
    try {
      const result: any = await apiClient.deleteMenu(menu.code);
      showToast('success', `Deactivated ${result?.cascadedMenus ?? 0} child menu(s)`);
      await load();
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    }
  };

  const renderNode = (node: MenuNode, depth = 0): React.ReactElement => (
    <div key={node.code}>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-black border border-mono-dark-grey p-3 flex items-center justify-between"
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-white/10 flex items-center justify-center shrink-0">
            {(() => {
              const Icon = getIcon(node.icon);
              return <Icon className="w-4 h-4 text-white" />;
            })()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold uppercase text-white text-sm truncate">{node.name}</span>
              <code className="text-[10px] bg-white/10 px-1.5 py-0.5">{node.code}</code>
              {!node.is_active && (
                <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 font-bold uppercase">Inactive</span>
              )}
              {node.is_new_tab && (
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 font-bold uppercase">New Tab</span>
              )}
            </div>
            <p className="text-[10px] text-mono-light-grey mt-0.5 truncate">
              {node.slug || '(no slug)'} · order: {node.order}
            </p>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => openCreate(node.code)}
            className="p-1.5 border border-mono-dark-grey hover:border-white text-[#CCCCCC] hover:text-white"
            aria-label={`Add child to ${node.code}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openEdit(node)}
            className="p-1.5 border border-mono-dark-grey hover:border-white text-[#CCCCCC] hover:text-white"
            aria-label={`Edit ${node.code}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(node)}
            className="p-1.5 border border-mono-dark-grey hover:border-red-500 text-[#CCCCCC] hover:text-red-500"
            aria-label={`Delete ${node.code}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
      {node.children.length > 0 && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-bold text-2xl md:text-4xl uppercase text-white mb-2">
          Menu <span className="text-transparent stroke-text" style={{ WebkitTextStroke: '2px white' }}>Management</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
          {'// SIDEBAR_MENU_TREE_EDITOR'}
        </p>
      </motion.div>

      <div className="flex justify-between items-center">
        <p className="text-xs text-mono-light-grey uppercase tracking-widest">
          {menus.length} menu(s) · {tree.length} root(s)
        </p>
        <button
          onClick={() => openCreate()}
          className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border border-white transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Menu
        </button>
      </div>

      {isLoading && (
        <div className="space-y-2" aria-busy="true">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-black border border-mono-dark-grey p-3 flex items-center gap-3">
              <Skeleton variant="circle" className="w-8 h-8" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-2 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="border border-red-500/50 bg-red-500/5 p-4">
          <p className="text-red-400 text-sm uppercase mb-2">Failed to load menus</p>
          <p className="text-mono-light-grey text-sm mb-3">{error}</p>
          <button onClick={load} className="px-4 py-2 bg-white text-black text-xs font-bold uppercase">Retry</button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-1">
          {tree.length === 0 ? (
            <p className="text-mono-light-grey text-sm text-center py-8">No menus yet.</p>
          ) : (
            tree.map((node) => renderNode(node))
          )}
        </div>
      )}

      <AnimatePresence>
        {modalMode && (
          <div className="fixed inset-0 bg-black/60 flex justify-end z-50" onClick={closeModal}>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-black border-l border-white w-full max-w-md h-full p-6 overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display font-bold text-xl uppercase text-white">
                {modalMode === 'create' ? 'New Menu' : `Edit ${editingMenu?.code}`}
              </h2>
              <button onClick={closeModal} aria-label="Close" className="p-1 hover:bg-white/10">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Code {modalMode === 'edit' && '(immutable)'}
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  disabled={modalMode === 'edit'}
                  required
                  pattern="[A-Z][A-Z0-9_]{1,49}"
                  placeholder="EVENTS_CATEGORIES"
                  className="w-full bg-black border border-white text-white px-3 py-2 disabled:opacity-50 uppercase"
                />
              </div>
              <div>
                <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full bg-black border border-white text-white px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Parent</label>
                <select
                  value={form.parent_code || ''}
                  onChange={(e) => {
                    const newParent = e.target.value;
                    let newSlug = form.slug;
                    if (newParent && modalMode === 'create') {
                      const pMenu = menus.find(m => m.code === newParent);
                      if (pMenu && pMenu.slug && (!newSlug || newSlug === '/')) {
                        newSlug = pMenu.slug + '/';
                      }
                    }
                    setForm({ ...form, parent_code: newParent, slug: newSlug });
                  }}
                  className="w-full bg-black border border-white text-white px-3 py-2"
                >
                  <option value="">(root)</option>
                  {rootMenus.filter((m) => m.code !== form.code).map((m) => (
                    <option key={m.code} value={m.code}>{m.name} ({m.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Icon</label>
                <select
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full bg-black border border-white text-white px-3 py-2"
                >
                  {listIconNames().map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Slug (URL)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="/dashboard/events"
                  pattern="^/.*"
                  className="w-full bg-black border border-white text-white px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Order</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                    className="w-full bg-black border border-white text-white px-3 py-2"
                  />
                  <p className="text-[10px] text-mono-light-grey mt-1 normal-case tracking-normal">
                    0 appears first, then 1, 2...
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Open In</label>
                  <select
                    value={form.is_new_tab ? 'new' : 'same'}
                    onChange={(e) => setForm({ ...form, is_new_tab: e.target.value === 'new' })}
                    className="w-full bg-black border border-white text-white px-3 py-2"
                  >
                    <option value="same">Same Tab</option>
                    <option value="new">New Tab</option>
                  </select>
                </div>
              </div>
              {modalMode === 'edit' && (
                <div>
                  <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Active</label>
                  <select
                    value={form.is_active === false ? 'false' : 'true'}
                    onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}
                    className="w-full bg-black border border-white text-white px-3 py-2"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-mono-dark-grey text-[#CCCCCC] hover:border-white hover:text-white uppercase text-xs font-bold tracking-wide"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-white text-black border border-white hover:bg-transparent hover:text-white uppercase text-xs font-bold tracking-wide flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (modalMode === 'create' ? 'Create' : 'Save')}
                </button>
              </div>
            </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 p-4 border max-w-sm flex items-start gap-3 ${
            toast.type === 'success' ? 'bg-white text-black border-white' : 'bg-red-500/20 text-red-300 border-red-500'
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
