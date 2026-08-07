'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save, SlidersHorizontal } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface RefundPolicy {
  id: string;
  rule_code: string;
  label: string;
  percentage: number;
  is_active: boolean;
  updated_at: string;
  updater?: { name: string; email: string } | null;
}

export default function RefundPolicySettingsPage() {
  const [policies, setPolicies] = useState<RefundPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      setPolicies((await apiClient.get<RefundPolicy[]>('/refunds/policies')) ?? []);
    } catch (error) {
      setMessage(apiClient.getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function updateLocal(id: string, patch: Partial<RefundPolicy>) {
    setPolicies((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function save(policy: RefundPolicy) {
    if (!Number.isInteger(policy.percentage) || policy.percentage < 0 || policy.percentage > 100) {
      setMessage('Percentage must be a whole number between 0 and 100.');
      return;
    }
    setSaving(policy.id);
    setMessage('');
    try {
      await apiClient.patch(`/refunds/policies/${policy.rule_code}`, {
        percentage: policy.percentage,
        is_active: policy.is_active,
      });
      setMessage(`${policy.label} updated. New requests use this value immediately.`);
      await load();
    } catch (error) {
      setMessage(apiClient.getErrorMessage(error));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <header className="flex items-center gap-3">
        <SlidersHorizontal className="h-7 w-7" />
        <div>
          <h1 className="text-2xl font-black uppercase">Refund Policy Settings</h1>
          <p className="text-sm text-mono-light-grey">Runtime percentages — no code change or redeploy required.</p>
        </div>
      </header>

      {message && <div className="border border-mono-light-grey p-3 text-sm">{message}</div>}
      {loading ? <p>Loading policies...</p> : (
        <div className="grid gap-4">
          {policies.map((policy) => (
            <section key={policy.id} className="border-2 border-black bg-white p-5 text-black shadow-brutal">
              <div className="grid gap-4 md:grid-cols-[1fr_180px_120px_auto] md:items-end">
                <div>
                  <p className="font-black uppercase">{policy.label}</p>
                  <p className="text-xs font-mono">{policy.rule_code}</p>
                </div>
                <label className="text-xs font-bold uppercase">
                  Percentage
                  <input
                    className="mt-1 w-full border-2 border-black p-2 text-lg font-black"
                    type="number" min={0} max={100} step={1}
                    value={policy.percentage}
                    onChange={(event) => updateLocal(policy.id, { percentage: Number(event.target.value) })}
                  />
                </label>
                <label className="flex items-center gap-2 pb-2 text-xs font-bold uppercase">
                  <input type="checkbox" checked={policy.is_active}
                    onChange={(event) => updateLocal(policy.id, { is_active: event.target.checked })} /> Active
                </label>
                <button
                  className="flex items-center justify-center gap-2 border-2 border-black bg-yellow-300 px-4 py-2 font-black uppercase disabled:opacity-50"
                  disabled={saving === policy.id}
                  onClick={() => void save(policy)}
                >
                  <Save className="h-4 w-4" /> {saving === policy.id ? 'Saving' : 'Save'}
                </button>
              </div>
              <p className="mt-3 text-[11px] text-gray-600">
                Last update: {new Date(policy.updated_at).toLocaleString()} {policy.updater ? `by ${policy.updater.name}` : ''}
              </p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
