'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';

type RefundStatus = 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED';

interface RefundRow {
  id: string;
  amount: string | number;
  currency: string;
  percentage: number;
  reason: string;
  status: RefundStatus;
  failure_reason?: string | null;
  created_at: string;
  booking: { booking_code: string; event: { title: string } };
  requester: { name: string; email: string };
}

export default function RefundManagementPage() {
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      setRefunds((await apiClient.get<RefundRow[]>('/refunds')) ?? []);
    } catch (error) {
      setMessage(apiClient.getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function action(id: string, type: 'approve' | 'reject' | 'retry') {
    const note = type === 'reject' ? window.prompt('Rejection reason (optional):') ?? undefined : undefined;
    setWorking(id);
    setMessage('');
    try {
      await apiClient.patch(`/refunds/${id}/${type}`, note ? { note } : {});
      setMessage(`Refund ${type} action completed.`);
      await load();
    } catch (error) {
      setMessage(apiClient.getErrorMessage(error));
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-black uppercase">Refund Management</h1>
        <p className="text-sm text-mono-light-grey">Admin sees all requests; organizers only see their own events.</p>
      </header>
      {message && <div className="border border-mono-light-grey p-3 text-sm">{message}</div>}
      {loading ? <p>Loading refunds...</p> : refunds.length === 0 ? (
        <div className="border border-mono-dark-grey p-8 text-center text-mono-light-grey">No refund requests.</div>
      ) : (
        <div className="grid gap-4">
          {refunds.map((refund) => (
            <article key={refund.id} className="border border-mono-dark-grey p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-black uppercase">{refund.booking.event.title}</p>
                  <p className="text-xs text-mono-light-grey">{refund.booking.booking_code} • {refund.requester.name} ({refund.requester.email})</p>
                  <p className="mt-2 text-sm">{formatCurrency(refund.amount, refund.currency)} ({refund.percentage}%) • {refund.reason}</p>
                  {refund.failure_reason && <p className="mt-1 text-xs text-red-400">{refund.failure_reason}</p>}
                </div>
                <span className="border px-3 py-1 text-xs font-black">{refund.status}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {refund.status === 'REQUESTED' && <>
                  <button disabled={working === refund.id} onClick={() => void action(refund.id, 'approve')}
                    className="flex items-center gap-2 border border-green-400 px-4 py-2 text-xs font-bold uppercase text-green-400 disabled:opacity-50">
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button disabled={working === refund.id} onClick={() => void action(refund.id, 'reject')}
                    className="flex items-center gap-2 border border-red-400 px-4 py-2 text-xs font-bold uppercase text-red-400 disabled:opacity-50">
                    <X className="h-4 w-4" /> Reject
                  </button>
                </>}
                {refund.status === 'FAILED' && (
                  <button disabled={working === refund.id} onClick={() => void action(refund.id, 'retry')}
                    className="flex items-center gap-2 border border-yellow-300 px-4 py-2 text-xs font-bold uppercase text-yellow-300 disabled:opacity-50">
                    <RotateCcw className="h-4 w-4" /> Retry
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
