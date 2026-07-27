'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lock, Loader2, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import type { Role, Menu, RoleMenuPermission, PermissionCell } from '@/types/rbac';

type Matrix = Record<string, Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>>;
// matrix[role_code][menu_code] = flags

export default function AdminPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [matrix, setMatrix] = useState<Matrix>({});
  const [originalMatrix, setOriginalMatrix] = useState<Matrix>({}); // for dirty check
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // role_code being saved
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [roleData, menuData, permData] = await Promise.all([
        apiClient.listRoles({ is_active: true }),
        apiClient.listMenus({ is_active: true }),
        apiClient.getPermissionMatrix(),
      ]);
      const r = roleData ?? [];
      const rawM = menuData ?? [];
      const p: RoleMenuPermission[] = permData ?? [];

      // Build hierarchical menu list for the table
      const sortedM = [...rawM].sort((a, b) => a.order - b.order);
      const byCode = new Map<string, Menu & { children: any[] }>();
      for (const m of sortedM) byCode.set(m.code, { ...m, children: [] });
      const roots: any[] = [];
      for (const node of byCode.values()) {
        if (node.parent_code && byCode.has(node.parent_code)) {
          byCode.get(node.parent_code)!.children.push(node);
        } else {
          roots.push(node);
        }
      }
      
      const flatM: (Menu & { _depth: number })[] = [];
      const traverse = (nodes: any[], depth: number) => {
        for (const node of nodes) {
          const { children, ...rest } = node;
          flatM.push({ ...rest, _depth: depth });
          traverse(children, depth + 1);
        }
      };
      traverse(roots, 0);

      const next: Matrix = {};
      for (const role of r) {
        next[role.code] = {};
        for (const menu of flatM) {
          const existing = p.find(
            (x) => x.role_code === role.code && x.menu_code === menu.code && x.is_active,
          );
          next[role.code][menu.code] = {
            can_view: existing?.can_view ?? false,
            can_create: existing?.can_create ?? false,
            can_edit: existing?.can_edit ?? false,
            can_delete: existing?.can_delete ?? false,
          };
        }
      }
      setRoles(r);
      setMenus(flatM as Menu[]);
      setMatrix(next);
      setOriginalMatrix(JSON.parse(JSON.stringify(next)));
      // Default to the first role only if none is selected yet. The functional
      // updater keeps `activeRole` OUT of this callback's deps, so switching
      // role tabs no longer re-runs load() and discards unsaved edits.
      setActiveRole((cur) => cur ?? (r.length > 0 ? r[0].code : null));
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const toggle = (role_code: string, menu_code: string, flag: 'can_view' | 'can_create' | 'can_edit' | 'can_delete') => {
    setMatrix((prev) => ({
      ...prev,
      [role_code]: {
        ...prev[role_code],
        [menu_code]: {
          ...prev[role_code][menu_code],
          [flag]: !prev[role_code][menu_code][flag],
        },
      },
    }));
  };

  const isDirty = (role_code: string) => {
    return JSON.stringify(matrix[role_code]) !== JSON.stringify(originalMatrix[role_code]);
  };

  const handleSave = async (role_code: string) => {
    setSaving(role_code);
    try {
      const cells: PermissionCell[] = menus.map((m) => {
        const flagsForMenu = matrix[role_code][m.code];
        // A child menu's action grants are disabled in the UI when View is off,
        // but their stale `true` values stay in state. Normalize before saving
        // so we never persist a "can act but can't view" cell that the admin
        // can no longer see or clear through the grid.
        if (m.parent_code && !flagsForMenu.can_view) {
          return {
            menu_code: m.code,
            can_view: false,
            can_create: false,
            can_edit: false,
            can_delete: false,
          };
        }
        return { menu_code: m.code, ...flagsForMenu };
      });
      await apiClient.replaceRolePermissions(role_code, cells);
      setOriginalMatrix((prev) => ({
        ...prev,
        [role_code]: JSON.parse(JSON.stringify(matrix[role_code])),
      }));
      showToast('success', `Permissions saved for ${role_code}`);
    } catch (err) {
      showToast('error', apiClient.getErrorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  const flags: Array<{ key: 'can_view' | 'can_create' | 'can_edit' | 'can_delete'; label: string }> = [
    { key: 'can_view', label: 'View' },
    { key: 'can_create', label: 'Create' },
    { key: 'can_edit', label: 'Edit' },
    { key: 'can_delete', label: 'Delete' },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-bold text-2xl md:text-4xl uppercase text-white mb-2">
          Permission <span className="text-transparent stroke-text" style={{ WebkitTextStroke: '2px white' }}>Matrix</span>
        </h1>
        <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
          {'// ROLE_X_MENU_PERMISSION_GRID'}
        </p>
      </motion.div>

      {/* Role tabs */}
      {!isLoading && roles.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {roles.map((role) => (
            <button
              key={role.code}
              onClick={() => setActiveRole(role.code)}
              className={`px-4 py-2 text-xs font-bold uppercase border whitespace-nowrap transition-all flex items-center gap-2 ${
                activeRole === role.code
                  ? 'bg-white text-black border-white'
                  : 'bg-black text-[#CCCCCC] border-mono-dark-grey hover:border-white'
              }`}
            >
              {role.name}
              {isDirty(role.code) && (
                <span className="w-2 h-2 bg-yellow-500 rounded-full" aria-label="unsaved changes" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2" aria-busy="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-black border border-mono-dark-grey p-3 flex items-center justify-between">
              <Skeleton className="h-3 w-32" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((j) => <Skeleton key={j} className="w-12 h-6" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Matrix grid for active role */}
      {!isLoading && activeRole && matrix[activeRole] && (
        <div className="space-y-4">
          <div className="border border-mono-dark-grey">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_repeat(4,60px)] md:grid-cols-[1fr_repeat(4,80px)] bg-white/5 border-b border-mono-dark-grey">
              <div className="p-3 text-xs font-bold uppercase text-mono-light-grey tracking-widest">Menu</div>
              {flags.map((f) => (
                <div key={f.key} className="p-3 text-center text-xs font-bold uppercase text-mono-light-grey tracking-widest">
                  {f.label}
                </div>
              ))}
            </div>
            {/* Rows */}
            {menus.map((menu, idx) => {
              const cell = matrix[activeRole][menu.code];
              if (!cell) return null;
              // Cast menu to access the _depth we added
              const depth = (menu as any)._depth || 0;
              return (
                <div
                  key={menu.code}
                  className={`grid grid-cols-[1fr_repeat(4,60px)] md:grid-cols-[1fr_repeat(4,80px)] border-b border-mono-dark-grey last:border-b-0 ${
                    idx % 2 === 1 ? 'bg-white/[0.02]' : ''
                  }`}
                >
                  <div className="p-3 flex items-center min-w-0">
                    <div style={{ marginLeft: `${depth * 16}px` }}>
                      <code className="text-xs text-mono-light-grey mr-2">{menu.code}</code>
                      <span className={`text-sm ${menu.parent_code ? 'text-[#999]' : 'text-white font-bold'}`}>
                        {menu.name}
                      </span>
                    </div>
                  </div>
                  {flags.map((f) => {
                    const checked = cell[f.key] as boolean;
                    const isDisabled = !!menu.parent_code && f.key !== 'can_view' && !cell.can_view;
                    return (
                      <div key={f.key} className="p-3 flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isDisabled}
                          onChange={() => toggle(activeRole, menu.code, f.key)}
                          aria-label={`${activeRole} ${menu.code} ${f.label}`}
                          className="w-4 h-4 cursor-pointer accent-white disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Save button */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-mono-light-grey uppercase tracking-widest">
              {isDirty(activeRole) ? (
                <span className="text-yellow-500">● Unsaved changes</span>
              ) : (
                <span>All changes saved</span>
              )}
            </p>
            <button
              onClick={() => handleSave(activeRole)}
              disabled={!isDirty(activeRole) || saving === activeRole}
              className="px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border border-white transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving === activeRole ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <><Save className="w-4 h-4" /> Save {activeRole}</>
              )}
            </button>
          </div>
        </div>
      )}

      {!isLoading && roles.length === 0 && (
        <div className="border border-mono-dark-grey p-8 text-center">
          <Lock className="w-10 h-10 text-mono-dark-grey mx-auto mb-3" />
          <p className="text-mono-light-grey text-sm">No active roles. Create roles first.</p>
        </div>
      )}

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
