'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  FileText,
  RefreshCw,
  Save,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import type {
  DisputeDetail,
  DisputeEvidenceType,
  SaveEvidenceInput,
} from '@/types/dispute';

const evidenceSchema = z.object({
  product_description: z.string().max(5000, 'Maximum 5,000 characters.'),
  customer_name: z.string().max(255, 'Maximum 255 characters.'),
  customer_email: z.union([z.literal(''), z.string().email('Enter a valid email address.')]),
  service_date: z.string(),
  access_activity: z.string().max(5000, 'Maximum 5,000 characters.'),
  uncategorized: z.string().max(5000, 'Maximum 5,000 characters.'),
});

type EvidenceForm = z.infer<typeof evidenceSchema>;

type ConfirmAction = 'submit' | 'close';

const EVIDENCE_TYPES: Array<{ value: DisputeEvidenceType; label: string }> = [
  { value: 'CUSTOMER_COMMUNICATION', label: 'Customer communication' },
  { value: 'CUSTOMER_SIGNATURE', label: 'Customer signature' },
  { value: 'RECEIPT', label: 'Receipt' },
  { value: 'REFUND_POLICY', label: 'Refund policy' },
  { value: 'SERVICE_DOCUMENTATION', label: 'Service documentation' },
  { value: 'UNCATEGORIZED_FILE', label: 'Uncategorized file' },
];

const ACCEPTED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const ACCEPTED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg']);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function formatDateTime(value?: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(status: DisputeDetail['status']) {
  return status === 'CLOSED' ? 'Under review' : status.toLowerCase();
}

function evidenceDefaults(dispute: DisputeDetail): EvidenceForm {
  return {
    product_description: dispute.evidence_product_description ?? '',
    customer_name: dispute.evidence_customer_name ?? '',
    customer_email: dispute.evidence_customer_email ?? '',
    service_date: toDateInput(dispute.evidence_service_date),
    access_activity: dispute.evidence_access_activity ?? '',
    uncategorized: dispute.evidence_uncategorized ?? '',
  };
}

function definitionRow(label: string, value: React.ReactNode) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
      <dt className="text-[11px] font-bold uppercase text-mono-light-grey">{label}</dt>
      <dd className="min-w-0 break-words text-sm">{value || 'Not available'}</dd>
    </div>
  );
}

export default function AdminDisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const disputeId = params.id;
  const [dispute, setDispute] = useState<DisputeDetail>();
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string }>();
  const [working, setWorking] = useState<'save' | 'sync' | 'submit' | 'close' | 'upload'>();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>();
  const [evidenceType, setEvidenceType] = useState<DisputeEvidenceType>('CUSTOMER_COMMUNICATION');
  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EvidenceForm>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: {
      product_description: '',
      customer_name: '',
      customer_email: '',
      service_date: '',
      access_activity: '',
      uncategorized: '',
    },
  });

  const load = useCallback(async () => {
    if (!disputeId) return;
    setLoading(true);
    setPageError('');
    try {
      const result = await apiClient.getDispute(disputeId);
      if (!result) throw new Error('Dispute response was empty.');
      setDispute(result);
      reset(evidenceDefaults(result));
    } catch (error) {
      setPageError(apiClient.getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [disputeId, reset]);

  useEffect(() => {
    void load();
  }, [load]);

  const deadlineTime = dispute?.evidence_due_by ? new Date(dispute.evidence_due_by).getTime() : Number.NaN;
  const deadlineExpired = Number.isNaN(deadlineTime) || deadlineTime <= Date.now();
  const isOpen = dispute?.status === 'OPEN';
  const isTerminal = dispute?.status === 'WON' || dispute?.status === 'LOST';
  const evidenceEditable = Boolean(isOpen && !deadlineExpired);
  const anyWorking = Boolean(working);

  async function runAction(action: Exclude<ConfirmAction, 'submit'> | 'sync') {
    if (!dispute) return;
    setWorking(action);
    setNotice(undefined);
    try {
      if (action === 'sync') {
        await apiClient.syncDispute(dispute.id);
        setNotice({ type: 'success', message: 'Stripe status synchronized.' });
      } else {
        await apiClient.closeDispute(dispute.id);
        setNotice({ type: 'success', message: 'Dispute closed in Stripe.' });
      }
      setConfirmAction(undefined);
      await load();
    } catch (error) {
      setNotice({ type: 'error', message: apiClient.getErrorMessage(error) });
    } finally {
      setWorking(undefined);
    }
  }

  async function saveEvidence(values: EvidenceForm) {
    if (!dispute || !evidenceEditable) return;
    setWorking('save');
    setNotice(undefined);
    const payload: SaveEvidenceInput = {
      product_description: values.product_description,
      customer_name: values.customer_name,
      customer_email: values.customer_email || undefined,
      service_date: values.service_date || undefined,
      access_activity: values.access_activity,
      uncategorized: values.uncategorized,
    };
    try {
      await apiClient.saveDisputeEvidence(dispute.id, payload);
      setNotice({ type: 'success', message: 'Evidence draft saved.' });
      await load();
    } catch (error) {
      setNotice({ type: 'error', message: apiClient.getErrorMessage(error) });
    } finally {
      setWorking(undefined);
    }
  }

  async function submitEvidence() {
    if (!dispute || !evidenceEditable) return;
    setWorking('submit');
    setNotice(undefined);
    try {
      await apiClient.submitDisputeEvidence(dispute.id);
      setConfirmAction(undefined);
      setNotice({ type: 'success', message: 'Evidence submitted to Stripe.' });
      await load();
    } catch (error) {
      setNotice({ type: 'error', message: apiClient.getErrorMessage(error) });
    } finally {
      setWorking(undefined);
    }
  }

  function selectFile(selected?: File) {
    setFileError('');
    setUploadProgress(0);
    if (!selected) {
      setFile(undefined);
      return;
    }
    const extension = selected.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ACCEPTED_MIME.has(selected.type) || !ACCEPTED_EXTENSIONS.has(extension)) {
      setFile(undefined);
      setFileError('Choose a PDF, PNG, JPG, or JPEG file.');
      return;
    }
    if (selected.size === 0) {
      setFile(undefined);
      setFileError('The selected file is empty.');
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setFile(undefined);
      setFileError('The selected file exceeds the 5 MB limit.');
      return;
    }
    setFile(selected);
  }

  async function uploadDocument() {
    if (!dispute || !file || !evidenceEditable) return;
    setWorking('upload');
    setNotice(undefined);
    setFileError('');
    setUploadProgress(0);
    try {
      await apiClient.uploadDisputeDocument(dispute.id, evidenceType, file, setUploadProgress);
      setNotice({ type: 'success', message: 'Evidence document uploaded.' });
      setFile(undefined);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (error) {
      setFileError(apiClient.getErrorMessage(error));
    } finally {
      setWorking(undefined);
    }
  }

  if (loading && !dispute) {
    return (
      <main className="space-y-4 p-4 sm:p-6 md:p-8" aria-busy="true" aria-label="Loading dispute">
        <div className="h-20 animate-pulse border border-mono-dark-grey bg-white/5" />
        <div className="h-64 animate-pulse border border-mono-dark-grey bg-white/5" />
        <div className="h-80 animate-pulse border border-mono-dark-grey bg-white/5" />
      </main>
    );
  }

  if (pageError && !dispute) {
    return (
      <main className="p-4 sm:p-6 md:p-8">
        <div role="alert" className="border border-red-400 p-6">
          <AlertCircle className="h-6 w-6 text-red-300" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-black uppercase">Unable to load dispute</h1>
          <p className="mt-2 break-words text-sm text-mono-light-grey">{pageError}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => void load()} className="border border-white px-4 py-2 text-xs font-bold uppercase">Retry</button>
            <Link href="/dashboard/admin/disputes" className="border border-mono-light-grey px-4 py-2 text-xs font-bold uppercase">Back to disputes</Link>
          </div>
        </div>
      </main>
    );
  }

  if (!dispute) return null;

  const customerName = dispute.booking.user?.name || dispute.booking.guest_name || 'Not available';
  const customerEmail = dispute.booking.user?.email || dispute.booking.guest_email || 'Not available';
  const timeline = [
    { label: 'Opened', value: dispute.opened_at, complete: true },
    { label: 'Evidence submitted', value: dispute.evidence_submitted_at, complete: Boolean(dispute.evidence_submitted_at) },
    { label: dispute.status === 'CLOSED' ? 'Under review' : 'Closed', value: dispute.closed_at, complete: Boolean(dispute.closed_at) },
    { label: dispute.status === 'WON' ? 'Won' : dispute.status === 'LOST' ? 'Lost' : 'Outcome pending', value: isTerminal ? dispute.closed_at : null, complete: isTerminal },
  ];

  return (
    <main className="space-y-6 p-4 sm:p-6 md:p-8">
      <Link href="/dashboard/admin/disputes" className="inline-flex items-center gap-2 text-xs font-bold uppercase text-mono-light-grey hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to disputes
      </Link>

      <header className="flex flex-col gap-4 border-b border-mono-dark-grey pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black uppercase">Dispute {dispute.booking.booking_code}</h1>
            <span className="border border-mono-light-grey px-2 py-1 text-[11px] font-bold uppercase">{statusLabel(dispute.status)}</span>
          </div>
          <p className="mt-2 break-all text-xs text-mono-light-grey">Stripe ID: {dispute.stripe_dispute_id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runAction('sync')}
            disabled={anyWorking || isTerminal}
            title={isTerminal ? 'Terminal disputes cannot be synchronized.' : undefined}
            className="inline-flex min-h-touch items-center gap-2 border border-mono-light-grey px-4 py-2 text-xs font-bold uppercase hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${working === 'sync' ? 'animate-spin' : ''}`} aria-hidden="true" /> Sync Stripe
          </button>
          <button
            type="button"
            onClick={() => setConfirmAction('submit')}
            disabled={anyWorking || !evidenceEditable}
            title={!evidenceEditable ? 'Evidence actions require an open dispute before its deadline.' : undefined}
            className="inline-flex min-h-touch items-center gap-2 border border-white bg-white px-4 py-2 text-xs font-bold uppercase text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden="true" /> Submit Evidence
          </button>
          <button
            type="button"
            onClick={() => setConfirmAction('close')}
            disabled={anyWorking || !evidenceEditable}
            title={!evidenceEditable ? 'Only open disputes before the deadline can be closed.' : undefined}
            className="inline-flex min-h-touch items-center gap-2 border border-red-400 px-4 py-2 text-xs font-bold uppercase text-red-300 hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" /> Close Dispute
          </button>
        </div>
      </header>

      {notice && (
        <div role={notice.type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 border p-4 text-sm ${notice.type === 'error' ? 'border-red-400 text-red-300' : 'border-white text-white'}`}>
          {notice.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" /> : <Check className="h-5 w-5 shrink-0" aria-hidden="true" />}
          <p className="break-words">{notice.message}</p>
        </div>
      )}

      {(!isOpen || deadlineExpired) && (
        <div className="flex items-start gap-3 border border-yellow-300 p-4 text-sm text-yellow-200">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{!isOpen ? `Evidence editing is unavailable while this dispute is ${statusLabel(dispute.status)}.` : 'The evidence deadline has passed. Evidence actions are disabled.'}</p>
        </div>
      )}

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="mb-3 text-sm font-black uppercase">Dispute Summary</h2>
        <dl className="grid border border-mono-dark-grey divide-y divide-mono-dark-grey md:grid-cols-2 md:divide-y-0">
          <div className="divide-y divide-mono-dark-grey md:border-r md:border-mono-dark-grey">
            {definitionRow('Amount', formatCurrency(dispute.amount, dispute.currency))}
            {definitionRow('Reason', dispute.reason || 'No reason provided')}
            {definitionRow('Opened', formatDateTime(dispute.opened_at))}
            {definitionRow('Deadline', <span className={deadlineExpired && isOpen ? 'text-red-300' : ''}>{formatDateTime(dispute.evidence_due_by)}</span>)}
          </div>
          <div className="divide-y divide-mono-dark-grey">
            {definitionRow('Booking', dispute.booking.booking_code)}
            {definitionRow('Event', dispute.booking.event.title)}
            {definitionRow('Customer', customerName)}
            {definitionRow('Email', customerEmail)}
          </div>
        </dl>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="payment-heading">
          <h2 id="payment-heading" className="mb-3 text-sm font-black uppercase">Payment & Booking</h2>
          <dl className="divide-y divide-mono-dark-grey border border-mono-dark-grey">
            {definitionRow('Payment status', dispute.payment.status)}
            {definitionRow('Provider', dispute.payment.provider)}
            {definitionRow('Provider reference', dispute.payment.provider_tx_id)}
            {definitionRow('Paid at', formatDateTime(dispute.payment.paid_at))}
            {definitionRow('Booking status', dispute.booking.status)}
            {definitionRow('Booking total', formatCurrency(dispute.booking.total_price, dispute.booking.currency))}
            {definitionRow('Tickets', dispute.booking.tickets?.length ?? 0)}
          </dl>
        </section>

        <section aria-labelledby="timeline-heading">
          <h2 id="timeline-heading" className="mb-3 text-sm font-black uppercase">Status Timeline</h2>
          <ol className="border border-mono-dark-grey p-4">
            {timeline.map((item, index) => (
              <li key={`${item.label}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
                {index < timeline.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-mono-dark-grey" aria-hidden="true" />}
                <span className={`relative mt-1 h-4 w-4 shrink-0 rounded-full border ${item.complete ? 'border-white bg-white' : 'border-mono-light-grey bg-black'}`} aria-hidden="true" />
                <div>
                  <p className={`text-xs font-bold uppercase ${item.complete ? 'text-white' : 'text-mono-light-grey'}`}>{item.label}</p>
                  <p className="mt-1 text-xs text-mono-light-grey">{item.complete ? formatDateTime(item.value) : 'Pending'}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <form onSubmit={handleSubmit(saveEvidence)} className="space-y-5" noValidate>
        <div className="flex flex-col gap-3 border-b border-mono-dark-grey pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase">Evidence Draft</h2>
            <p className="mt-1 text-xs text-mono-light-grey">Save typed evidence before submitting it to Stripe.</p>
          </div>
          <button
            type="submit"
            disabled={anyWorking || !evidenceEditable || !isDirty}
            className="inline-flex min-h-touch items-center justify-center gap-2 border border-white px-4 py-2 text-xs font-bold uppercase hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-4 w-4" aria-hidden="true" /> {working === 'save' ? 'Saving...' : 'Save Draft'}
          </button>
        </div>

        <fieldset disabled={!evidenceEditable || anyWorking} className="grid gap-4 md:grid-cols-2 disabled:opacity-60">
          <label className="text-xs font-bold uppercase">
            Customer Name
            <input {...register('customer_name')} maxLength={255} aria-invalid={Boolean(errors.customer_name)} aria-describedby={errors.customer_name ? 'customer-name-error' : undefined} className="mt-2 min-h-touch w-full border border-mono-light-grey bg-black px-3 py-2 text-sm font-normal normal-case" />
            {errors.customer_name && <span id="customer-name-error" className="mt-1 block text-red-300">{errors.customer_name.message}</span>}
          </label>
          <label className="text-xs font-bold uppercase">
            Customer Email
            <input {...register('customer_email')} type="email" aria-invalid={Boolean(errors.customer_email)} aria-describedby={errors.customer_email ? 'customer-email-error' : undefined} className="mt-2 min-h-touch w-full border border-mono-light-grey bg-black px-3 py-2 text-sm font-normal normal-case" />
            {errors.customer_email && <span id="customer-email-error" className="mt-1 block text-red-300">{errors.customer_email.message}</span>}
          </label>
          <label className="text-xs font-bold uppercase">
            Service Date
            <input {...register('service_date')} type="date" className="mt-2 min-h-touch w-full border border-mono-light-grey bg-black px-3 py-2 text-sm font-normal normal-case [color-scheme:dark]" />
          </label>
          <label className="text-xs font-bold uppercase md:col-span-2">
            Product Description
            <textarea {...register('product_description')} maxLength={5000} rows={4} aria-invalid={Boolean(errors.product_description)} aria-describedby={errors.product_description ? 'product-description-error' : undefined} className="mt-2 w-full border border-mono-light-grey bg-black px-3 py-2 text-sm font-normal normal-case" />
            {errors.product_description && <span id="product-description-error" className="mt-1 block text-red-300">{errors.product_description.message}</span>}
          </label>
          <label className="text-xs font-bold uppercase md:col-span-2">
            Access Activity
            <textarea {...register('access_activity')} maxLength={5000} rows={4} aria-invalid={Boolean(errors.access_activity)} aria-describedby={errors.access_activity ? 'access-activity-error' : undefined} className="mt-2 w-full border border-mono-light-grey bg-black px-3 py-2 text-sm font-normal normal-case" />
            {errors.access_activity && <span id="access-activity-error" className="mt-1 block text-red-300">{errors.access_activity.message}</span>}
          </label>
          <label className="text-xs font-bold uppercase md:col-span-2">
            Additional Evidence
            <textarea {...register('uncategorized')} maxLength={5000} rows={4} aria-invalid={Boolean(errors.uncategorized)} aria-describedby={errors.uncategorized ? 'uncategorized-error' : undefined} className="mt-2 w-full border border-mono-light-grey bg-black px-3 py-2 text-sm font-normal normal-case" />
            {errors.uncategorized && <span id="uncategorized-error" className="mt-1 block text-red-300">{errors.uncategorized.message}</span>}
          </label>
        </fieldset>
      </form>

      <section aria-labelledby="documents-heading" className="space-y-4">
        <div className="border-b border-mono-dark-grey pb-3">
          <h2 id="documents-heading" className="text-sm font-black uppercase">Evidence Documents</h2>
          <p className="mt-1 text-xs text-mono-light-grey">PDF, PNG, JPG, or JPEG. Maximum 5 MB per file.</p>
        </div>

        <fieldset disabled={!evidenceEditable || anyWorking} className="grid gap-4 border border-mono-dark-grey p-4 sm:grid-cols-[minmax(180px,1fr)_minmax(220px,1.5fr)_auto] sm:items-end disabled:opacity-60">
          <label className="text-xs font-bold uppercase">
            Evidence Type
            <select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value as DisputeEvidenceType)} className="mt-2 min-h-touch w-full border border-mono-light-grey bg-black px-3 py-2 text-sm font-normal normal-case">
              {EVIDENCE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold uppercase">
            Document
            <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(event) => selectFile(event.target.files?.[0])} className="mt-2 block min-h-touch w-full cursor-pointer border border-mono-light-grey bg-black px-3 py-2 text-xs file:mr-3 file:border-0 file:bg-white file:px-3 file:py-1 file:text-xs file:font-bold file:uppercase file:text-black" />
          </label>
          <button type="button" onClick={() => void uploadDocument()} disabled={!file || !evidenceEditable || anyWorking} className="inline-flex min-h-touch items-center justify-center gap-2 border border-white px-4 py-2 text-xs font-bold uppercase hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40">
            <Upload className="h-4 w-4" aria-hidden="true" /> {working === 'upload' ? 'Uploading...' : 'Upload'}
          </button>
          {(file || fileError || working === 'upload') && (
            <div className="sm:col-span-3" aria-live="polite">
              {file && <p className="text-xs text-mono-light-grey">Selected: {file.name} · {formatBytes(file.size)}</p>}
              {fileError && <p role="alert" className="text-xs text-red-300">{fileError}</p>}
              {working === 'upload' && (
                <div className="mt-2">
                  <div className="h-2 overflow-hidden bg-mono-dark-grey" aria-label={`Upload ${uploadProgress}% complete`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress}>
                    <div className="h-full bg-white transition-[width]" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="mt-1 text-right text-[11px] text-mono-light-grey">{uploadProgress}%</p>
                </div>
              )}
            </div>
          )}
        </fieldset>

        {dispute.documents.length === 0 ? (
          <div className="border border-mono-dark-grey p-8 text-center text-sm text-mono-light-grey">No evidence documents uploaded.</div>
        ) : (
          <ul className="divide-y divide-mono-dark-grey border border-mono-dark-grey">
            {dispute.documents.map((document) => (
              <li key={document.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="break-all text-sm font-bold">{document.original_name}</p>
                    <p className="mt-1 text-[11px] uppercase text-mono-light-grey">{document.evidence_type.replaceAll('_', ' ')} · {formatBytes(document.size)}</p>
                  </div>
                </div>
                <p className="shrink-0 text-xs text-mono-light-grey">{formatDateTime(document.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog.Root open={Boolean(confirmAction)} onOpenChange={(open) => !open && !anyWorking && setConfirmAction(undefined)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-white bg-black p-6 text-white focus:outline-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-black uppercase">{confirmAction === 'close' ? 'Close Dispute' : 'Submit Evidence'}</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-mono-light-grey">
                  {confirmAction === 'close'
                    ? 'Closing this dispute tells Stripe you accept the chargeback. This action cannot be undone.'
                    : 'Submit the saved fields and uploaded documents to Stripe. Evidence cannot be edited after the dispute enters review.'}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button type="button" disabled={anyWorking} aria-label="Close confirmation dialog" className="inline-flex h-10 w-10 shrink-0 items-center justify-center hover:bg-white/10 disabled:opacity-40">
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>
            <dl className="mt-5 divide-y divide-mono-dark-grey border border-mono-dark-grey">
              {definitionRow('Booking', dispute.booking.booking_code)}
              {definitionRow('Amount', formatCurrency(dispute.amount, dispute.currency))}
              {definitionRow('Deadline', formatDateTime(dispute.evidence_due_by))}
              {definitionRow('Documents', dispute.documents.length)}
            </dl>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <button type="button" disabled={anyWorking} className="min-h-touch border border-mono-light-grey px-4 py-2 text-xs font-bold uppercase disabled:opacity-40">Cancel</button>
              </Dialog.Close>
              <button
                type="button"
                onClick={() => confirmAction === 'submit' ? void submitEvidence() : void runAction('close')}
                disabled={anyWorking || !evidenceEditable}
                className={`inline-flex min-h-touch items-center justify-center gap-2 border px-4 py-2 text-xs font-bold uppercase disabled:opacity-40 ${confirmAction === 'close' ? 'border-red-400 bg-red-500 text-white' : 'border-white bg-white text-black'}`}
              >
                {working === confirmAction && <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {confirmAction === 'close' ? 'Yes, Close Dispute' : 'Yes, Submit Evidence'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
