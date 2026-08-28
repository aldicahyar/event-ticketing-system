'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Activity, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

const ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE'];

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'border-green-400 text-green-300',
  UPDATE: 'border-yellow-400 text-yellow-300',
  DELETE: 'border-red-400 text-red-300',
};

interface ActivityRow {
  id: string;
  actor_id: string | null;
  action: string;
  model: string;
  target_id: string;
  target_type: string;
  metadata: unknown;
  created_at: string;
  actor: { id: string; name: string; email: string } | null;
}

export default function AdminActivityPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [meta, setMeta] = useState<{ page: number; totalPages: number; total: number }>();
  const [action, setAction] = useState('');
  const [model, setModel] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.getActivityFeed({ action, model, page, limit: 30 });
      setRows(res.data ?? []);
      setMeta(res.meta);
    } catch (err) {
      setRows([]);
      setError(apiClient.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [action, model, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="space-y-6 md:space-y-8">
      <header className="flex flex-col gap-4 border-b border-mono-dark-grey pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-white md:text-4xl">
            Activity{' '}
            <span className="text-transparent" style={{ WebkitTextStroke: '2px white' }}>
              Feed
            </span>
          </h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-mono-light-grey md:text-sm">
            {'// CROSS_DOMAIN_AUDIT · LAST_30_DAYS'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-touch items-center gap-2 border border-mono-light-grey px-4 py-2 text-xs font-bold uppercase hover:bg-white hover:text-black disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold uppercase" htmlFor="action">
          Action
          <select
            id="action"
            value={action}
            onChange={(e) => {
              setPage(1);
              setAction(e.target.value);
            }}
            className="mt-2 block min-h-touch border border-mono-light-grey bg-black px-3 py-2 text-sm text-white"
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a || 'All'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase" htmlFor="model">
          Model
          <input
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                void load();
              }
            }}
            placeholder="t_trx_payments"
            className="mt-2 block min-h-touch border border-mono-light-grey bg-black px-3 py-2 font-mono text-sm text-white outline-none"
          />
        </label>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 border border-red-400 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" aria-hidden="true" />
          <p className="min-w-0 flex-1 break-words text-white">{error}</p>
        </div>
      )}

      <section aria-label="Activity timeline">
        {loading ? (
          <p className="py-8 text-center text-mono-light-grey">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-mono-light-grey">
            <Activity className="h-8 w-8" aria-hidden="true" />
            <p>No activity in this window.</p>
          </div>
        ) : (
          <ol className="relative space-y-4 border-l border-mono-dark-grey pl-6">
            {rows.map((r) => (
              <li key={r.id} className="relative">
                <span
                  className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-mono-light-grey bg-black"
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className={`border px-2 py-0.5 text-[11px] font-bold uppercase ${
                      ACTION_COLOR[r.action] ?? 'border-mono-light-grey'
                    }`}
                  >
                    {r.action}
                  </span>
                  <span className="font-mono text-mono-light-grey">{r.model}</span>
                  <span className="font-mono text-xs text-mono-light-grey">#{r.target_id.slice(-8)}</span>
                </div>
                <p className="mt-1 text-xs text-mono-light-grey">
                  {r.actor ? (
                    <>
                      <span className="text-white">{r.actor.name}</span> · {r.actor.email}
                    </>
                  ) : (
                    <span className="italic">System / webhook</span>
                  )}
                  {' · '}
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs uppercase">
          <span className="text-mono-light-grey">
            Page {meta.page} / {meta.totalPages} · {meta.total} total
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((n) => n - 1)}
              className="border border-mono-light-grey px-3 py-1 font-bold disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((n) => n + 1)}
              className="border border-mono-light-grey px-3 py-1 font-bold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
