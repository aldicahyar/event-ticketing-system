'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserPlus, Edit2, Trash2, Loader2, CheckCircle, AlertCircle, X,
  Search, Lock, Unlock, KeyRound, ChevronLeft, ChevronRight, RotateCcw, Eye,
  type LucideIcon,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import type { Role } from '@/types/rbac';
import type {
  AdminUser, UserListMeta, UserStats, ListUsersQuery,
  CreateUserDto, UpdateUserDto,
} from '@/types/user';

type ModalMode = 'create' | 'edit' | 'password' | 'detail' | null;
type Toast = { type: 'success' | 'error'; msg: string };

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  email: '',
  name: '',
  password: '',
  roleCode: 'ATTENDEE',
  isActive: true,
  emailVerified: true,
};

/** Short, locale-stable date rendering. Returns an em dash for null. */
function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${fmtDate(value)} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function AdminUsersPage() {
  // ----- data -----
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<UserListMeta | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // ----- filters -----
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');   // '' | 'active' | 'inactive'
  const [verifiedFilter, setVerifiedFilter] = useState(''); // '' | 'yes' | 'no'
  const [lockedFilter, setLockedFilter] = useState('');   // '' | 'yes' | 'no'
  const [page, setPage] = useState(1);

  // ----- modal -----
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((type: Toast['type'], msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const query = useMemo<ListUsersQuery>(() => ({
    search: search || undefined,
    roleCode: roleFilter || undefined,
    isActive: statusFilter === '' ? undefined : statusFilter === 'active',
    emailVerified: verifiedFilter === '' ? undefined : verifiedFilter === 'yes',
    locked: lockedFilter === '' ? undefined : lockedFilter === 'yes',
    page,
    limit: PAGE_SIZE,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }), [search, roleFilter, statusFilter, verifiedFilter, lockedFilter, page]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [list, statsData] = await Promise.all([
        apiClient.listUsers(query),
        apiClient.getUserStats().catch(() => null),
      ]);
      setUsers(list?.items ?? []);
      setMeta(list?.meta ?? null);
      if (statsData) setStats(statsData);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
      setUsers([]);
      setMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  // Role list feeds the filter dropdown and the create/edit form.
  useEffect(() => {
    apiClient
      .listRoles({ isActive: true })
      .then((data) => setRoles(data ?? []))
      .catch(() => setRoles([]));
  }, []);

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setVerifiedFilter('');
    setLockedFilter('');
    setPage(1);
  };

  const hasFilters =
    !!search || !!roleFilter || !!statusFilter || !!verifiedFilter || !!lockedFilter;

  // ============================================================
  // ACTIONS
  // ============================================================

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, roleCode: roles[0]?.code ?? 'ATTENDEE' });
    setSelected(null);
    setModalMode('create');
  };

  const openEdit = (user: AdminUser) => {
    setForm({
      email: user.email,
      name: user.name,
      password: '',
      roleCode: user.roleCode,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
    });
    setSelected(user);
    setModalMode('edit');
  };

  const openPassword = (user: AdminUser) => {
    setNewPassword('');
    setSelected(user);
    setModalMode('password');
  };

  const openDetail = (user: AdminUser) => {
    setSelected(user);
    setModalMode('detail');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
    setSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalMode === 'create') {
        const dto: CreateUserDto = {
          email: form.email.trim(),
          name: form.name.trim(),
          password: form.password,
          roleCode: form.roleCode,
          isActive: form.isActive,
          emailVerified: form.emailVerified,
        };
        await apiClient.createUser(dto);
        showToast('success', `User '${dto.email}' created`);
      } else if (modalMode === 'edit' && selected) {
        const dto: UpdateUserDto = {};
        if (form.email.trim() !== selected.email) dto.email = form.email.trim();
        if (form.name.trim() !== selected.name) dto.name = form.name.trim();
        if (form.roleCode !== selected.roleCode) dto.roleCode = form.roleCode;
        if (form.isActive !== selected.isActive) dto.isActive = form.isActive;
        if (form.emailVerified !== selected.emailVerified) dto.emailVerified = form.emailVerified;

        if (Object.keys(dto).length === 0) {
          showToast('error', 'No changes to save');
          setSaving(false);
          return;
        }
        await apiClient.updateUser(selected.id, dto);
        showToast('success', `User '${selected.email}' updated`);
      } else if (modalMode === 'password' && selected) {
        await apiClient.resetUserPassword(selected.id, newPassword);
        showToast('success', `Password reset — all sessions of '${selected.email}' revoked`);
      }
      closeModal();
      await load();
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
      setSaving(false);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    const bookings = user._count?.bookings ?? 0;
    if (bookings > 0) {
      showToast(
        'error',
        `Cannot delete — ${bookings} booking(s) attached. Deactivate the account instead.`,
      );
      return;
    }
    if (!confirm(`Permanently delete '${user.email}'? This cannot be undone.`)) return;

    setBusyId(user.id);
    try {
      await apiClient.deleteUser(user.id);
      showToast('success', `User '${user.email}' deleted`);
      await load();
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleUnlock = async (user: AdminUser) => {
    setBusyId(user.id);
    try {
      await apiClient.unlockUser(user.id);
      showToast('success', `Account '${user.email}' unlocked`);
      await load();
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    const next = !user.isActive;
    if (!next && !confirm(`Deactivate '${user.email}'? They will be signed out immediately.`)) return;

    setBusyId(user.id);
    try {
      await apiClient.updateUser(user.id, { isActive: next });
      showToast('success', `User '${user.email}' ${next ? 'activated' : 'deactivated'}`);
      await load();
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  const statCards = stats
    ? [
        { label: 'Total', value: stats.total },
        { label: 'Active', value: stats.active },
        { label: 'Inactive', value: stats.inactive },
        { label: 'Unverified', value: stats.unverified },
        { label: 'Locked', value: stats.locked },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-bold text-2xl md:text-4xl uppercase text-white mb-2">
          User{' '}
          <span className="text-transparent" style={{ WebkitTextStroke: '2px white' }}>
            Management
          </span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
          {'// MONITOR_AND_MANAGE_ALL_ACCOUNTS'}
        </p>
      </motion.div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {statCards.map((card) => (
            <div key={card.label} className="bg-black border border-mono-dark-grey p-3">
              <p className="text-[10px] text-mono-light-grey uppercase tracking-widest">
                {card.label}
              </p>
              <p className="font-display font-bold text-2xl text-white mt-1">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Role breakdown */}
      {stats && stats.byRole.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.byRole.map((r) => (
            <button
              key={r.roleCode}
              onClick={() => { setRoleFilter(r.roleCode === roleFilter ? '' : r.roleCode); setPage(1); }}
              className={`text-[10px] px-2 py-1 uppercase font-bold border transition-colors ${
                roleFilter === r.roleCode
                  ? 'bg-white text-black border-white'
                  : 'border-mono-dark-grey text-mono-light-grey hover:border-white hover:text-white'
              }`}
            >
              {r.roleCode} · {r.count}
            </button>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-black border border-mono-dark-grey p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name or email..."
              aria-label="Search users"
              className="w-full bg-black border border-mono-dark-grey focus:border-white text-white pl-9 pr-3 py-2 text-sm outline-none transition-colors"
            />
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border border-white transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <UserPlus className="w-4 h-4" /> New User
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            aria-label="Filter by role"
            className="bg-black border border-mono-dark-grey focus:border-white text-white px-2 py-2 text-xs uppercase outline-none"
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            aria-label="Filter by status"
            className="bg-black border border-mono-dark-grey focus:border-white text-white px-2 py-2 text-xs uppercase outline-none"
          >
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={verifiedFilter}
            onChange={(e) => { setVerifiedFilter(e.target.value); setPage(1); }}
            aria-label="Filter by email verification"
            className="bg-black border border-mono-dark-grey focus:border-white text-white px-2 py-2 text-xs uppercase outline-none"
          >
            <option value="">All verification</option>
            <option value="yes">Verified</option>
            <option value="no">Unverified</option>
          </select>

          <select
            value={lockedFilter}
            onChange={(e) => { setLockedFilter(e.target.value); setPage(1); }}
            aria-label="Filter by lock state"
            className="bg-black border border-mono-dark-grey focus:border-white text-white px-2 py-2 text-xs uppercase outline-none"
          >
            <option value="">All lock states</option>
            <option value="yes">Locked</option>
            <option value="no">Not locked</option>
          </select>

          <button
            onClick={resetFilters}
            disabled={!hasFilters}
            className="border border-mono-dark-grey text-mono-light-grey hover:border-white hover:text-white px-2 py-2 text-xs uppercase font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {/* Result count */}
      {!isLoading && !error && meta && (
        <p className="text-xs text-mono-light-grey uppercase tracking-widest">
          {meta.total} user{meta.total !== 1 ? 's' : ''}
          {hasFilters ? ' (filtered)' : ''} · page {meta.page}/{meta.totalPages}
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2" aria-busy="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-black border border-mono-dark-grey p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton variant="circle" className="w-8 h-8" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2 w-48" />
                </div>
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="border border-red-500/50 bg-red-500/5 p-4">
          <p className="text-red-400 text-sm uppercase mb-2">Failed to load users</p>
          <p className="text-mono-light-grey text-sm mb-3">{error}</p>
          <button onClick={load} className="px-4 py-2 bg-white text-black text-xs font-bold uppercase">
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && users.length === 0 && (
        <div className="border border-mono-dark-grey p-10 text-center">
          <Users className="w-10 h-10 text-mono-dark-grey mx-auto mb-3" aria-hidden="true" />
          <p className="text-mono-light-grey uppercase text-sm tracking-widest">
            {hasFilters ? 'No user matches these filters' : 'No users yet'}
          </p>
          {hasFilters && (
            <button onClick={resetFilters} className="mt-4 px-4 py-2 border border-white text-white text-xs font-bold uppercase hover:bg-white hover:text-black transition-all">
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Table (desktop) */}
      {!isLoading && !error && users.length > 0 && (
        <div className="hidden lg:block border border-mono-dark-grey overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">List of registered users</caption>
            <thead>
              <tr className="border-b border-mono-dark-grey text-[10px] uppercase tracking-widest text-mono-light-grey">
                <th scope="col" className="text-left px-3 py-3 font-bold">User</th>
                <th scope="col" className="text-left px-3 py-3 font-bold">Role</th>
                <th scope="col" className="text-left px-3 py-3 font-bold">Status</th>
                <th scope="col" className="text-left px-3 py-3 font-bold">Provider</th>
                <th scope="col" className="text-left px-3 py-3 font-bold">Last login</th>
                <th scope="col" className="text-right px-3 py-3 font-bold">Bookings</th>
                <th scope="col" className="text-left px-3 py-3 font-bold">Joined</th>
                <th scope="col" className="text-right px-3 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-mono-dark-grey/50 last:border-0 hover:bg-white/[0.03] transition-colors">
                  <td className="px-3 py-3">
                    <div className="font-bold text-white">{u.name}</div>
                    <div className="text-xs text-mono-light-grey">{u.email}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 uppercase font-bold text-white">
                      {u.roleCode}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className={`text-[10px] px-1.5 py-0.5 font-bold uppercase ${
                        u.isActive ? 'bg-white text-black' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {!u.emailVerified && (
                        <span className="text-[10px] px-1.5 py-0.5 font-bold uppercase bg-yellow-500/20 text-yellow-400">
                          Unverified
                        </span>
                      )}
                      {u.isLocked && (
                        <span className="text-[10px] px-1.5 py-0.5 font-bold uppercase bg-red-500/20 text-red-400 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-mono-light-grey uppercase">{u.provider}</td>
                  <td className="px-3 py-3 text-xs text-mono-light-grey">{fmtDate(u.lastLoginAt)}</td>
                  <td className="px-3 py-3 text-xs text-mono-light-grey text-right">{u._count?.bookings ?? 0}</td>
                  <td className="px-3 py-3 text-xs text-mono-light-grey">{fmtDate(u.createdAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1 justify-end">
                      <RowAction label={`View ${u.email}`} onClick={() => openDetail(u)} icon={Eye} />
                      <RowAction label={`Edit ${u.email}`} onClick={() => openEdit(u)} icon={Edit2} />
                      <RowAction
                        label={`${u.isActive ? 'Deactivate' : 'Activate'} ${u.email}`}
                        onClick={() => handleToggleActive(u)}
                        icon={u.isActive ? Lock : Unlock}
                        busy={busyId === u.id}
                      />
                      {u.isLocked && (
                        <RowAction
                          label={`Unlock ${u.email}`}
                          onClick={() => handleUnlock(u)}
                          icon={Unlock}
                          busy={busyId === u.id}
                          tone="warn"
                        />
                      )}
                      <RowAction label={`Reset password for ${u.email}`} onClick={() => openPassword(u)} icon={KeyRound} />
                      <RowAction
                        label={`Delete ${u.email}`}
                        onClick={() => handleDelete(u)}
                        icon={Trash2}
                        busy={busyId === u.id}
                        tone="danger"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards (mobile / tablet) */}
      {!isLoading && !error && users.length > 0 && (
        <div className="lg:hidden space-y-2">
          {users.map((u, idx) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              className="bg-black border border-mono-dark-grey p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold uppercase text-white truncate">{u.name}</p>
                  <p className="text-xs text-mono-light-grey truncate">{u.email}</p>
                </div>
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 uppercase font-bold text-white shrink-0">
                  {u.roleCode}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                <span className={`text-[10px] px-1.5 py-0.5 font-bold uppercase ${
                  u.isActive ? 'bg-white text-black' : 'bg-red-500/20 text-red-400'
                }`}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 font-bold uppercase ${
                  u.emailVerified ? 'bg-white/10 text-white' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {u.emailVerified ? 'Verified' : 'Unverified'}
                </span>
                {u.isLocked && (
                  <span className="text-[10px] px-1.5 py-0.5 font-bold uppercase bg-red-500/20 text-red-400">
                    Locked
                  </span>
                )}
                <span className="text-[10px] px-1.5 py-0.5 font-bold uppercase bg-white/10 text-white">
                  {u.provider}
                </span>
              </div>

              <dl className="grid grid-cols-3 gap-2 text-[10px] uppercase">
                <div>
                  <dt className="text-[#666]">Last login</dt>
                  <dd className="text-mono-light-grey mt-0.5">{fmtDate(u.lastLoginAt)}</dd>
                </div>
                <div>
                  <dt className="text-[#666]">Bookings</dt>
                  <dd className="text-mono-light-grey mt-0.5">{u._count?.bookings ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-[#666]">Joined</dt>
                  <dd className="text-mono-light-grey mt-0.5">{fmtDate(u.createdAt)}</dd>
                </div>
              </dl>

              <div className="flex gap-1 flex-wrap">
                <RowAction label={`View ${u.email}`} onClick={() => openDetail(u)} icon={Eye} />
                <RowAction label={`Edit ${u.email}`} onClick={() => openEdit(u)} icon={Edit2} />
                <RowAction
                  label={`${u.isActive ? 'Deactivate' : 'Activate'} ${u.email}`}
                  onClick={() => handleToggleActive(u)}
                  icon={u.isActive ? Lock : Unlock}
                  busy={busyId === u.id}
                />
                {u.isLocked && (
                  <RowAction label={`Unlock ${u.email}`} onClick={() => handleUnlock(u)} icon={Unlock} busy={busyId === u.id} tone="warn" />
                )}
                <RowAction label={`Reset password for ${u.email}`} onClick={() => openPassword(u)} icon={KeyRound} />
                <RowAction label={`Delete ${u.email}`} onClick={() => handleDelete(u)} icon={Trash2} busy={busyId === u.id} tone="danger" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!meta.hasPrev}
            className="px-3 py-2 border border-mono-dark-grey text-[#CCCCCC] hover:border-white hover:text-white text-xs font-bold uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-xs text-mono-light-grey uppercase tracking-widest">
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!meta.hasNext}
            className="px-3 py-2 border border-mono-dark-grey text-[#CCCCCC] hover:border-white hover:text-white text-xs font-bold uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===== Modals ===== */}
      {modalMode && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="bg-black border border-white max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={
              modalMode === 'create' ? 'Create user'
                : modalMode === 'edit' ? 'Edit user'
                : modalMode === 'password' ? 'Reset password'
                : 'User detail'
            }
          >
            <div className="flex justify-between items-start mb-6 gap-3">
              <h2 className="font-display font-bold text-xl uppercase text-white">
                {modalMode === 'create' && 'New User'}
                {modalMode === 'edit' && 'Edit User'}
                {modalMode === 'password' && 'Reset Password'}
                {modalMode === 'detail' && 'User Detail'}
              </h2>
              <button onClick={closeModal} aria-label="Close modal" className="p-1 hover:bg-white/10 shrink-0">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* --- Detail view --- */}
            {modalMode === 'detail' && selected && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold uppercase text-white truncate">{selected.name}</p>
                    <p className="text-xs text-mono-light-grey truncate">{selected.email}</p>
                  </div>
                </div>

                <dl className="space-y-2 text-xs">
                  <DetailRow label="User ID" value={selected.id} mono />
                  <DetailRow label="Role" value={`${selected.role?.name ?? selected.roleCode} (${selected.roleCode})`} />
                  <DetailRow label="Status" value={selected.isActive ? 'Active' : 'Inactive'} />
                  <DetailRow label="Email verified" value={selected.emailVerified ? 'Yes' : 'No'} />
                  <DetailRow label="Provider" value={selected.provider} />
                  <DetailRow label="Locked" value={selected.isLocked ? `Until ${fmtDateTime(selected.lockedUntil)}` : 'No'} />
                  <DetailRow label="Failed logins" value={String(selected.failedLoginAttempts)} />
                  <DetailRow label="Last login" value={fmtDateTime(selected.lastLoginAt)} />
                  <DetailRow label="Last failed login" value={fmtDateTime(selected.lastFailedLoginAt)} />
                  <DetailRow label="Password changed" value={fmtDateTime(selected.passwordChangedAt)} />
                  <DetailRow label="Bookings" value={String(selected._count?.bookings ?? 0)} />
                  <DetailRow label="Registered" value={fmtDateTime(selected.createdAt)} />
                  <DetailRow label="Last updated" value={fmtDateTime(selected.updatedAt)} />
                </dl>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-mono-dark-grey text-[#CCCCCC] hover:border-white hover:text-white uppercase text-xs font-bold tracking-wide transition-all"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(selected)}
                    className="flex-1 px-4 py-2 bg-white text-black border border-white hover:bg-transparent hover:text-white uppercase text-xs font-bold tracking-wide transition-all"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}

            {/* --- Create / Edit form --- */}
            {(modalMode === 'create' || modalMode === 'edit') && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Name">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    minLength={2}
                    maxLength={100}
                    className="w-full bg-black border border-white text-white px-3 py-2"
                  />
                </Field>

                <Field label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="w-full bg-black border border-white text-white px-3 py-2"
                  />
                </Field>

                {modalMode === 'create' && (
                  <Field
                    label="Password"
                    hint="Min 8 chars with uppercase, lowercase, number and special character"
                  >
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      className="w-full bg-black border border-white text-white px-3 py-2"
                    />
                  </Field>
                )}

                <Field label="Role">
                  <select
                    value={form.roleCode}
                    onChange={(e) => setForm({ ...form, roleCode: e.target.value })}
                    required
                    className="w-full bg-black border border-white text-white px-3 py-2"
                  >
                    {roles.length === 0 && <option value={form.roleCode}>{form.roleCode}</option>}
                    {roles.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Account status">
                  <select
                    value={form.isActive ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                    className="w-full bg-black border border-white text-white px-3 py-2"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </Field>

                <Field label="Email verified">
                  <select
                    value={form.emailVerified ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, emailVerified: e.target.value === 'true' })}
                    className="w-full bg-black border border-white text-white px-3 py-2"
                  >
                    <option value="true">Verified</option>
                    <option value="false">Unverified</option>
                  </select>
                </Field>

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
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : modalMode === 'create' ? 'Create' : 'Save'}
                  </button>
                </div>
              </form>
            )}

            {/* --- Reset password --- */}
            {modalMode === 'password' && selected && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-xs text-mono-light-grey">
                  Setting a new password for{' '}
                  <span className="text-white font-bold">{selected.email}</span>. All of their
                  active sessions will be revoked immediately.
                </p>
                <Field
                  label="New password"
                  hint="Min 8 chars with uppercase, lowercase, number and special character"
                >
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    className="w-full bg-black border border-white text-white px-3 py-2"
                  />
                </Field>
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
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 p-4 border max-w-sm flex items-start gap-3 ${
            toast.type === 'success'
              ? 'bg-white text-black border-white'
              : 'bg-red-500/20 text-red-300 border-red-500'
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

// ============================================================
// SMALL PRESENTATIONAL HELPERS
// ============================================================

function RowAction({
  label,
  onClick,
  icon: Icon,
  busy = false,
  tone = 'default',
}: {
  label: string;
  onClick: () => void;
  icon: LucideIcon;
  busy?: boolean;
  tone?: 'default' | 'danger' | 'warn';
}) {
  const toneClass =
    tone === 'danger'
      ? 'hover:border-red-500 hover:text-red-500'
      : tone === 'warn'
        ? 'hover:border-yellow-500 hover:text-yellow-500'
        : 'hover:border-white hover:text-white';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={label}
      className={`p-2 border border-mono-dark-grey text-[#CCCCCC] transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${toneClass}`}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-[#666] mt-1">{hint}</p>}
    </div>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-mono-dark-grey/50 pb-2">
      <dt className="text-mono-light-grey uppercase tracking-widest shrink-0">{label}</dt>
      <dd className={`text-white text-right break-all ${mono ? 'font-mono text-[10px]' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
