'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Lock, RotateCcw, X } from 'lucide-react';
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
  review_note?: string | null;
  created_at: string;
  booking: {
    booking_code: string;
    event: { title: string };
    seats?: { id: string; row: string; number: number; type: string }[];
  };
  requester: { name: string; email: string };
}

type ActionType = 'approve' | 'reject' | 'retry';

function formatDateTimeLocal(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RefundManagementPage() {
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState<{ refund: RefundRow; type: ActionType } | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);

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

  // Close modal with Escape + lock body scroll while the modal is open
  useEffect(() => {
    if (!confirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) closeConfirm();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [confirm, submitting]);

  // Focus the reason field whenever the modal opens
  useEffect(() => {
    if (confirm && noteRef.current) {
      noteRef.current.focus();
    }
  }, [confirm]);

  function openConfirm(refund: RefundRow, type: ActionType) {
    setNote('');
    setSubmitting(false);
    setConfirm({ refund, type });
  }

  function closeConfirm() {
    setConfirm(null);
    setNote('');
    setSubmitting(false);
  }

  async function executeAction() {
    if (!confirm) return;
    // A specific reason is mandatory for approve and reject (moderation audit trail)
    if (confirm.type !== 'retry' && note.trim().length === 0) return;
    setSubmitting(true);
    setWorking(confirm.refund.id);
    setMessage('');
    try {
      await apiClient.patch(
        `/refunds/${confirm.refund.id}/${confirm.type}`,
        note.trim() ? { note: note.trim() } : {},
      );
      setMessage(`Refund ${confirm.type} action completed.`);
      closeConfirm();
      await load();
    } catch (error) {
      setMessage(apiClient.getErrorMessage(error));
    } finally {
      setWorking(null);
      setSubmitting(false);
    }
  }

  const actionLabel: Record<ActionType, string> = {
    approve: 'Yes, Approve Refund',
    reject: 'Yes, Reject Refund',
    retry: 'Yes, Retry',
  };

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
                  <button disabled={working === refund.id} onClick={() => openConfirm(refund, 'approve')}
                    className="flex items-center gap-2 border border-green-400 px-4 py-2 text-xs font-bold uppercase text-green-400 disabled:opacity-50">
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button disabled={working === refund.id} onClick={() => openConfirm(refund, 'reject')}
                    className="flex items-center gap-2 border border-red-400 px-4 py-2 text-xs font-bold uppercase text-red-400 disabled:opacity-50">
                    <X className="h-4 w-4" /> Reject
                  </button>
                </>}
                {refund.status === 'FAILED' && (
                  <button disabled={working === refund.id} onClick={() => openConfirm(refund, 'retry')}
                    className="flex items-center gap-2 border border-yellow-300 px-4 py-2 text-xs font-bold uppercase text-yellow-300 disabled:opacity-50">
                    <RotateCcw className="h-4 w-4" /> Retry
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Refund Action Confirmation Modal */}
      {confirm && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={submitting ? undefined : closeConfirm}
          role="presentation"
        >
          <div
            className="bg-black border border-white max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-confirm-title"
            aria-describedby="refund-confirm-desc"
          >
            <div className="flex justify-between items-start gap-3 mb-4">
              <h2 id="refund-confirm-title" className="font-display font-bold text-xl uppercase text-white">
                Confirm Refund Action
              </h2>
              <button
                onClick={closeConfirm}
                disabled={submitting}
                aria-label="Close modal"
                className="p-1 hover:bg-white/10 shrink-0 disabled:opacity-50"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex items-start gap-2 mb-4">
              <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${confirm.type === 'reject' ? 'text-red-400' : confirm.type === 'approve' ? 'text-green-400' : 'text-yellow-300'}`} />
              <p id="refund-confirm-desc" className="text-sm text-[#CCCCCC]">
                Are you sure you want to{' '}
                <span className="font-bold uppercase text-white">
                  {confirm.type === 'approve' ? 'approve' : confirm.type === 'reject' ? 'reject' : 'retry'}
                </span>{' '}
                this refund request? This action cannot be undone once executed.
              </p>
            </div>

            <dl className="border border-mono-dark-grey divide-y divide-mono-dark-grey mb-4 text-sm">
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-3 py-2">
                <dt className="text-mono-light-grey uppercase tracking-wider text-xs">Transaction ID</dt>
                <dd className="text-white font-mono">{confirm.refund.booking.booking_code}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-3 py-2">
                <dt className="text-mono-light-grey uppercase tracking-wider text-xs">Requester</dt>
                <dd className="text-white">{confirm.refund.requester.name} ({confirm.refund.requester.email})</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-3 py-2">
                <dt className="text-mono-light-grey uppercase tracking-wider text-xs">Refund Amount</dt>
                <dd className="text-white">{formatCurrency(confirm.refund.amount, confirm.refund.currency)} ({confirm.refund.percentage}%)</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-3 py-2">
                <dt className="text-mono-light-grey uppercase tracking-wider text-xs">Request Date</dt>
                <dd className="text-white">{formatDateTimeLocal(confirm.refund.created_at)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-3 py-2">
                <dt className="text-mono-light-grey uppercase tracking-wider text-xs">Seat(s)</dt>
                <dd className="text-white">
                  {confirm.refund.booking.seats && confirm.refund.booking.seats.length > 0
                    ? confirm.refund.booking.seats
                        .map((s) => `${s.row}${s.number}${s.type && s.type !== 'REGULAR' ? ` (${s.type})` : ''}`)
                        .join(', ')
                    : '—'}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-3 py-2">
                <dt className="text-mono-light-grey uppercase tracking-wider text-xs">Reason</dt>
                <dd className="text-white break-words min-w-0">
                  {confirm.refund.reason}
                  {confirm.refund.review_note && (
                    <span className="block mt-1 text-mono-light-grey italic">“{confirm.refund.review_note}”</span>
                  )}
                </dd>
              </div>
            </dl>

            {confirm.type !== 'retry' && (
              <div className="mb-4">
                <label htmlFor="review-note" className="block text-xs uppercase tracking-wider text-mono-light-grey mb-1">
                  {confirm.type === 'approve' ? 'Reason for Approval' : 'Reason for Rejection'}
                  <span className={confirm.type === 'approve' ? 'text-green-400' : 'text-red-400'}> *</span>
                </label>
                <textarea
                  id="review-note"
                  ref={noteRef}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={submitting}
                  required
                  rows={3}
                  placeholder={`Required: explain why this refund is being ${confirm.type === 'approve' ? 'approved' : 'rejected'}...`}
                  className="w-full border border-mono-dark-grey bg-black p-2 text-sm text-white placeholder:text-mono-light-grey focus:border-white outline-none disabled:opacity-50"
                />
                {note.trim().length === 0 && (
                  <p className="mt-1 text-xs text-red-400">
                    {confirm.type === 'approve' ? 'Reason for approval is required.' : 'Reason for rejection is required.'}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-1 mb-4 text-xs text-mono-light-grey">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>
                All actions are recorded in the system log along with the acting user and execution time.
              </span>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                onClick={closeConfirm}
                disabled={submitting}
                className="px-4 py-2 border border-mono-dark-grey text-[#CCCCCC] text-xs font-bold uppercase hover:border-white hover:text-white transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void executeAction()}
                disabled={submitting || (confirm.type !== 'retry' && note.trim().length === 0) || working === confirm.refund.id}
                className={`px-4 py-2 text-xs font-bold uppercase transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2 ${
                  confirm.type === 'approve'
                    ? 'bg-green-400 text-black border border-green-400 hover:bg-transparent hover:text-green-400'
                    : confirm.type === 'reject'
                    ? 'bg-red-400 text-black border border-red-400 hover:bg-transparent hover:text-red-400'
                    : 'bg-yellow-300 text-black border border-yellow-300 hover:bg-transparent hover:text-yellow-300'
                }`}
              >
                {submitting && <RotateCcw className="h-4 w-4 animate-spin" />}
                {actionLabel[confirm.type]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
