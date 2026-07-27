'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Plus, Edit2, Trash2, Loader2, CheckCircle, AlertCircle, X,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import type { Role, CreateRoleDto, UpdateRoleDto } from '@/types/rbac';

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState<CreateRoleDto & { is_active?: boolean }>({
    code: '', name: '', name_en: '', description: '', sort_order: 0,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.listRoles({ includePermissions: true });
      setRoles(data ?? []);
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

  const openCreate = () => {
    setForm({ code: '', name: '', name_en: '', description: '', sort_order: 0 });
    setEditingRole(null);
    setModalMode('create');
  };

  const openEdit = (role: Role) => {
    setForm({
      code: role.code, name: role.name, name_en: role.name_en ?? '',
      description: role.description ?? '', sort_order: role.sort_order, is_active: role.is_active,
    });
    setEditingRole(role);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingRole(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalMode === 'create') {
        await apiClient.createRole({
          code: form.code, name: form.name, name_en: form.name_en || undefined,
          description: form.description || undefined, sort_order: form.sort_order,
        });
        showToast('success', `Role '${form.code}' created`);
      } else if (modalMode === 'edit' && editingRole) {
        const dto: UpdateRoleDto = {
          name: form.name, name_en: form.name_en || undefined,
          description: form.description || undefined, sort_order: form.sort_order,
        };
        if (form.is_active !== undefined) dto.is_active = form.is_active;
        await apiClient.updateRole(editingRole.code, dto);
        showToast('success', `Role '${editingRole.code}' updated`);
      }
      closeModal();
      await load();
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.is_system) {
      showToast('error', `Cannot delete system role '${role.code}'`);
      return;
    }
    if (role._count?.users && role._count.users > 0) {
      showToast('error', `Cannot delete role with ${role._count.users} active user(s)`);
      return;
    }
    if (!confirm(`Deactivate role '${role.code}'? This will cascade to all permissions.`)) return;
    try {
      await apiClient.deleteRole(role.code);
      showToast('success', `Role '${role.code}' deactivated`);
      await load();
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-bold text-2xl md:text-4xl uppercase text-white mb-2">
          Role <span className="text-transparent stroke-text" style={{ WebkitTextStroke: '2px white' }}>Management</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
          {'// CREATE_AND_MANAGE_CUSTOM_ROLES'}
        </p>
      </motion.div>

      {/* Action bar */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-mono-light-grey uppercase tracking-widest">
          {roles.length} role{roles.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border border-white transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Role
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-black border border-mono-dark-grey p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton variant="circle" className="w-8 h-8" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="border border-red-500/50 bg-red-500/5 p-4">
          <p className="text-red-400 text-sm uppercase mb-2">Failed to load roles</p>
          <p className="text-mono-light-grey text-sm mb-3">{error}</p>
          <button onClick={load} className="px-4 py-2 bg-white text-black text-xs font-bold uppercase">Retry</button>
        </div>
      )}

      {/* Roles list */}
      {!isLoading && !error && (
        <div className="space-y-2">
          {roles.map((role, idx) => (
            <motion.div
              key={role.code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="bg-black border border-mono-dark-grey p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold uppercase text-white">{role.name}</span>
                    <code className="text-[10px] bg-white/10 px-1.5 py-0.5">{role.code}</code>
                    {role.is_system && (
                      <span className="text-[10px] bg-white text-black px-1.5 py-0.5 font-bold uppercase">System</span>
                    )}
                    {!role.is_active && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 font-bold uppercase">Inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-mono-light-grey mt-1">
                    {role.description || 'No description'}
                  </p>
                  <p className="text-[10px] text-[#666] mt-1 uppercase">
                    {role._count?.users ?? 0} user(s) · {role._count?.permissions ?? 0} perms
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(role)}
                  className="p-2 border border-mono-dark-grey hover:border-white text-[#CCCCCC] hover:text-white transition-colors"
                  aria-label={`Edit ${role.code}`}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(role)}
                  disabled={role.is_system}
                  className="p-2 border border-mono-dark-grey hover:border-red-500 text-[#CCCCCC] hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label={`Delete ${role.code}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalMode && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-black border border-white max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display font-bold text-xl uppercase text-white">
                {modalMode === 'create' ? 'New Role' : `Edit ${editingRole?.code}`}
              </h2>
              <button onClick={closeModal} aria-label="Close modal" className="p-1 hover:bg-white/10">
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
                  pattern="[A-Z][A-Z0-9_]{1,29}"
                  placeholder="CASHIER"
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
                <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">English Name (optional)</label>
                <input
                  type="text"
                  value={form.name_en}
                  onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                  className="w-full bg-black border border-white text-white px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full bg-black border border-white text-white px-3 py-2 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Sort Order</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full bg-black border border-white text-white px-3 py-2"
                />
              </div>
              {modalMode === 'edit' && (
                <div>
                  <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Active</label>
                  <select
                    value={form.is_active === false ? 'false' : 'true'}
                    onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}
                    disabled={editingRole?.is_system}
                    className="w-full bg-black border border-white text-white px-3 py-2 disabled:opacity-50"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  {editingRole?.is_system && (
                    <p className="text-[10px] text-mono-light-grey mt-1 uppercase">System role cannot be deactivated</p>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-mono-dark-grey text-[#CCCCCC] hover:border-white hover:text-white uppercase text-xs font-bold tracking-wide transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-white text-black border border-white hover:bg-transparent hover:text-white uppercase text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (modalMode === 'create' ? 'Create' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 p-4 border max-w-sm flex items-start gap-3 ${
            toast.type === 'success' ? 'bg-white text-black border-white' : 'bg-red-500/20 text-red-300 border-red-500'
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.type === 'success'
            ? <CheckCircle className="w-5 h-5 shrink-0" />
            : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
