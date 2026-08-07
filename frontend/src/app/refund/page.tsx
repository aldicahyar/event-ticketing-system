'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/ui/Footer';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';

const REASONS = [
  { value: 'EVENT_CANCELLED', label: 'Event cancelled by organizer' },
  { value: 'SCHEDULE_CONFLICT', label: 'Schedule conflict' },
  { value: 'CHANGE_OF_MIND', label: 'Change of mind' },
  { value: 'DUPLICATE_PURCHASE', label: 'Duplicate purchase' },
  { value: 'OTHER', label: 'Other' },
] as const;

interface Order {
  id: string;
  booking_code: string;
  total_price: string | number;
  currency: string;
  status: string;
  event: { title: string; start_date_time: string };
  payment: { status: string } | null;
}

interface RefundResult {
  id: string;
  amount: string | number;
  percentage: number;
  status: string;
}

export default function RefundPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookingId, setBookingId] = useState('');
  const [reason, setReason] = useState(REASONS[0].value);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RefundResult | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const data = (await apiClient.get<Order[]>('/bookings/my-orders')) ?? [];
      setOrders(data.filter((order) => order.status === 'CONFIRMED' && order.payment?.status === 'COMPLETED'));
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const booking = new URLSearchParams(window.location.search).get('booking');
    if (booking) setBookingId(booking);
    void loadOrders();
  }, [loadOrders]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!bookingId) { setError('Select a confirmed order.'); return; }
    if (note.length > 500) { setError('Note cannot exceed 500 characters.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const created = await apiClient.post<RefundResult>('/refunds', {
        booking_id: bookingId,
        reason,
        note: note || undefined,
      });
      if (!created) throw new Error('Refund response was empty');
      setResult(created);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <Navbar links={[{ href: '/events', label: 'Events' }, { href: '/dashboard/orders', label: 'My Orders' }]} />
      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="font-display text-4xl font-black uppercase">Request Refund</h1>
        <p className="mt-2 text-sm text-mono-light-grey">Refund percentage is calculated server-side using the active policy at approval time.</p>

        {error && <div className="mt-6 border border-red-500 p-4 text-red-300">{error}</div>}

        {result ? (
          <section className="mt-8 border-2 border-green-500 p-8">
            <h2 className="text-2xl font-black uppercase text-green-400">Request submitted</h2>
            <dl className="mt-5 grid gap-2 text-sm">
              <div><dt className="inline text-mono-light-grey">Request ID: </dt><dd className="inline">{result.id}</dd></div>
              <div><dt className="inline text-mono-light-grey">Status: </dt><dd className="inline">{result.status}</dd></div>
              <div><dt className="inline text-mono-light-grey">Estimated refund: </dt><dd className="inline">{formatCurrency(result.amount)} ({result.percentage}%)</dd></div>
            </dl>
            <Link href="/dashboard/orders" className="mt-6 inline-block border border-white px-5 py-3 font-bold uppercase">Back to orders</Link>
          </section>
        ) : (
          <form className="mt-8 space-y-6 border border-mono-dark-grey p-6" onSubmit={submit}>
            <label className="block text-xs font-bold uppercase">
              Confirmed order
              <select className="mt-2 w-full border border-white bg-black p-3" value={bookingId}
                onChange={(event) => setBookingId(event.target.value)} disabled={loading}>
                <option value="">{loading ? 'Loading...' : 'Select order'}</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.booking_code} — {order.event.title} — {formatCurrency(order.total_price, order.currency)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase">
              Reason
              <select className="mt-2 w-full border border-white bg-black p-3" value={reason}
                onChange={(event) => setReason(event.target.value as typeof reason)}>
                {REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase">
              Note (optional, max 500)
              <textarea className="mt-2 min-h-32 w-full border border-white bg-black p-3" maxLength={500}
                value={note} onChange={(event) => setNote(event.target.value)} />
              <span className="text-mono-light-grey">{note.length}/500</span>
            </label>
            <button className="w-full border-2 border-white bg-white p-4 font-black uppercase text-black disabled:opacity-50"
              disabled={submitting || loading || orders.length === 0}>
              {submitting ? 'Submitting...' : 'Submit Refund Request'}
            </button>
            {!loading && orders.length === 0 && <p className="text-sm text-yellow-300">No confirmed paid order is currently eligible.</p>}
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
