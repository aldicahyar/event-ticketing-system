'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Calendar, Plus, Edit2, Trash2, ArrowLeft
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency';
import { useAuth } from '@/contexts/AuthContext';

interface Venue {
  id: string;
  name: string;
  city: string;
}

interface Event {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  event_date: string;
  start_date_time: string;
  end_date_time: string;
  base_price: number;
  currency: string;
  status: string;
  image_url?: string;
  venue_id?: string;
  venue?: {
    name: string;
  };
}

const DEFAULT_FORM = {
  id: '',
  title: '',
  subtitle: '',
  description: '',
  venue_id: '',
  event_date: '',
  start_date_time: '',
  end_date_time: '',
  base_price: 150000,
  currency: DEFAULT_CURRENCY,
  status: 'DRAFT',
  image_url: ''
};

// Helper untuk format waktu local ISO YYYY-MM-DDTHH:MM
const toDatetimeLocal = (isoString?: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const tzoffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
};

export default function EventsManagementPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [activeView, setActiveView] = useState<'list' | 'create' | 'edit'>('list');
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !apiClient.getUser()) {
      router.push('/auth/login');
    }
  }, [authLoading, router]);

  const fetchEventsAndVenues = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [eventsData, venuesData] = await Promise.all([
        apiClient.get<Event[]>('/events'),
        apiClient.get<Venue[]>('/venues')
      ]);
      setEvents(eventsData || []);
      setVenues(venuesData || []);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEventsAndVenues();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      ...DEFAULT_FORM,
      venue_id: venues[0]?.id || ''
    });
    setError('');
    setSuccessMessage('');
    setActiveView('create');
  };

  const handleOpenEdit = (event: Event) => {
    setError('');
    setSuccessMessage('');
    setFormData({
      id: event.id,
      title: event.title,
      subtitle: event.subtitle || '',
      description: event.description,
      venue_id: event.venue_id || '',
      event_date: toDatetimeLocal(event.event_date),
      start_date_time: toDatetimeLocal(event.start_date_time),
      end_date_time: toDatetimeLocal(event.end_date_time),
      base_price: event.base_price,
      currency: event.currency || DEFAULT_CURRENCY,
      status: event.status,
      image_url: event.image_url || ''
    });
    setActiveView('edit');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!formData.title || !formData.description || !formData.venue_id || !formData.event_date || !formData.start_date_time || !formData.end_date_time) {
      setError('Please fill in all required fields.');
      return;
    }

    const payload = {
      title: formData.title,
      subtitle: formData.subtitle || undefined,
      description: formData.description,
      venue_id: formData.venue_id,
      event_date: new Date(formData.event_date).toISOString(),
      start_date_time: new Date(formData.start_date_time).toISOString(),
      end_date_time: new Date(formData.end_date_time).toISOString(),
      base_price: Number(formData.base_price),
      currency: formData.currency,
      status: formData.status,
      image_url: formData.image_url || undefined
    };

    try {
      if (activeView === 'create') {
        await apiClient.post('/events/create', payload);
        setSuccessMessage(`Event "${formData.title}" created successfully!`);
      } else {
        await apiClient.post('/events/update', { id: formData.id, ...payload });
        setSuccessMessage(`Event "${formData.title}" updated successfully!`);
      }
      fetchEventsAndVenues();
      setActiveView('list');
      setFormData(DEFAULT_FORM);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    setSuccessMessage('');
    try {
      await apiClient.post('/events/delete', { id });
      setSuccessMessage('Event deleted successfully!');
      fetchEventsAndVenues();
      setDeletingId(null);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-white text-black';
      case 'ONGOING': return 'bg-blue-500 text-white';
      case 'COMPLETED': return 'bg-[#444] text-white';
      case 'CANCELLED': return 'bg-red-500 text-white';
      default: return 'bg-mono-dark-grey text-[#CCCCCC]'; // DRAFT
    }
  };

  // Memecah ternary bertumpuk untuk rendering daftar event
  const renderEventsContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12 border border-mono-dark-grey text-mono-light-grey">
          Loading events data...
        </div>
      );
    }

    if (events.length === 0) {
      return (
        <div className="text-center py-12 border border-mono-dark-grey">
          <Calendar className="w-12 h-12 text-mono-dark-grey mx-auto mb-4" />
          <h3 className="font-bold uppercase text-white mb-2">No events configured</h3>
          <p className="text-mono-light-grey text-sm mb-4">
            Click &quot;Add Event&quot; to configure your first event listing.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto border border-mono-dark-grey">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-mono-dark-grey bg-white/5 uppercase text-xs">
              <th className="p-3 border-r border-mono-dark-grey font-bold">Event</th>
              <th className="p-3 border-r border-mono-dark-grey font-bold">Venue</th>
              <th className="p-3 border-r border-mono-dark-grey font-bold">Date & Time</th>
              <th className="p-3 border-r border-mono-dark-grey font-bold">Price</th>
              <th className="p-3 border-r border-mono-dark-grey font-bold">Status</th>
              <th className="p-3 font-bold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mono-dark-grey">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-white/5 transition-colors">
                <td className="p-3 border-r border-mono-dark-grey">
                  <div className="font-bold uppercase text-white leading-tight mb-1">{event.title}</div>
                  <div className="text-[10px] text-mono-light-grey">ID: {event.id}</div>
                </td>
                <td className="p-3 border-r border-mono-dark-grey text-sm uppercase text-[#CCCCCC]">
                  {event.venue?.name || 'Unassigned Venue'}
                </td>
                <td className="p-3 border-r border-mono-dark-grey text-xs text-[#CCCCCC]">
                  <div className="font-bold text-white mb-1">{new Date(event.event_date).toLocaleString()}</div>
                  <div className="text-[#888]">Sales: {new Date(event.start_date_time).toLocaleDateString()} - {new Date(event.end_date_time).toLocaleDateString()}</div>
                </td>
                <td className="p-3 border-r border-mono-dark-grey font-bold text-sm">
                  {/* base_price arrives as a Prisma Decimal serialized to a string;
                      coerce to Number so toLocaleString adds thousands separators. */}
                  {formatCurrency(event.base_price, event.currency)}
                </td>
                <td className="p-3 border-r border-mono-dark-grey">
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${getStatusBadgeClass(event.status)}`}>
                    {event.status}
                  </span>
                </td>
                <td className="p-3">
                  {deletingId === event.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[10px] text-red-500 font-bold uppercase">Confirm?</span>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="px-2 py-1 bg-red-600 text-white text-xs font-bold uppercase"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-2 py-1 bg-white text-black text-xs font-bold uppercase"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleOpenEdit(event)}
                        className="p-2 border border-mono-dark-grey hover:border-white transition-colors"
                        aria-label={`Edit ${event.title}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(event.id)}
                        className="p-2 border border-mono-dark-grey hover:border-red-500 hover:text-red-500 transition-colors"
                        aria-label={`Delete ${event.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-xl uppercase animate-pulse">Checking credentials...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-4xl uppercase text-white mb-2">
            Manage <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Events</span>
          </h1>
          <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
            {'// CONFIGURE_CONCERTS_SHOWS_AND_TICKETS'}
          </p>
        </div>
        {activeView === 'list' && (
          <button
            onClick={handleOpenCreate}
            disabled={venues.length === 0}
            className="self-start sm:self-auto px-6 py-3 bg-white text-black font-bold uppercase tracking-wider hover:bg-black hover:text-white border-2 border-white disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add Event
          </button>
        )}
      </div>

      {venues.length === 0 && !isLoading && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500 flex items-center gap-3 text-yellow-500 font-bold uppercase text-xs">
          <span>Warning: You must create at least one venue under &quot;Manage Venues&quot; before creating an event.</span>
        </div>
      )}

      {/* Notifikasi Status */}
      {successMessage && (
        <div className="p-4 bg-green-500/10 border border-green-500 flex items-center gap-3 text-green-500 font-bold uppercase text-sm">
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-600/10 border border-red-600 flex items-center gap-3 text-red-500 font-bold uppercase text-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Tampilan 1: LIST EVENTS */}
      {activeView === 'list' && renderEventsContent()}

      {/* Tampilan 2 & 3: CREATE / EDIT FORM */}
      {(activeView === 'create' || activeView === 'edit') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black border border-mono-dark-grey p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => setActiveView('list')}
              className="p-2 hover:bg-white/10 transition-colors"
              aria-label="Back to list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-display font-bold text-2xl uppercase">
              {activeView === 'create' ? 'Create New Event' : 'Edit Event Details'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Judul Event */}
              <div className="md:col-span-2">
                <label htmlFor="event-title" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Event Title *
                </label>
                <input
                  id="event-title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. BMTH CONCERT LIVE IN JAKARTA"
                  className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch"
                />
              </div>

              {/* Subtitle Event */}
              <div className="md:col-span-2">
                <label htmlFor="event-subtitle" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Event Subtitle / Tour Name (e.g. POST HUMAN: SURVIVAL HORROR)
                </label>
                <input
                  id="event-subtitle"
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. THE DEATH OF PEACE OF MIND"
                  className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch"
                />
              </div>

              {/* Venue Selection */}
              <div>
                <label htmlFor="event-venue_id" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Select Venue *
                </label>
                <select
                  id="event-venue_id"
                  required
                  value={formData.venue_id}
                  onChange={(e) => setFormData({ ...formData, venue_id: e.target.value })}
                  className="w-full bg-black border border-white text-white px-4 py-3 focus:outline-none focus:border-white/50 min-h-touch uppercase"
                >
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name} ({venue.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Base Price */}
              <div>
                <label htmlFor="event-base_price" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Base Ticket Price ({DEFAULT_CURRENCY}) *
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey font-bold">{DEFAULT_CURRENCY}</div>
                  <input
                    id="event-base_price"
                    type="number"
                    required
                    min="0"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                    className="w-full bg-black border border-white text-white px-12 py-3 text-base focus:outline-none focus:border-white/50 min-h-touch"
                  />
                </div>
                {/* Currency is locked to IDR for regulatory compliance (see ADR-001).
                    The field is rendered read-only so the value is explicit in the
                    form state and payload, without allowing an unsupported choice. */}
                <input type="hidden" name="currency" value={formData.currency} />
                <p className="mt-1 text-[10px] text-mono-light-grey uppercase tracking-widest">
                  Currency locked to {DEFAULT_CURRENCY}
                </p>
              </div>

              {/* Event Date Time */}
              <div>
                <label htmlFor="event-event_date" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Event Date & Time *
                </label>
                <input
                  id="event-event_date"
                  type="datetime-local"
                  required
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 min-h-touch"
                />
              </div>

              {/* Start Date Time */}
              <div>
                <label htmlFor="event-start_date_time" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Ticket Sales Start *
                </label>
                <input
                  id="event-start_date_time"
                  type="datetime-local"
                  required
                  value={formData.start_date_time}
                  onChange={(e) => setFormData({ ...formData, start_date_time: e.target.value })}
                  className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 min-h-touch"
                />
              </div>

              {/* End Date Time */}
              <div>
                <label htmlFor="event-end_date_time" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Ticket Sales End *
                </label>
                <input
                  id="event-end_date_time"
                  type="datetime-local"
                  required
                  value={formData.end_date_time}
                  onChange={(e) => setFormData({ ...formData, end_date_time: e.target.value })}
                  className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 min-h-touch"
                />
              </div>

              {/* Status */}
              <div>
                <label htmlFor="event-status" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Publishing Status *
                </label>
                <select
                  id="event-status"
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-black border border-white text-white px-4 py-3 focus:outline-none focus:border-white/50 min-h-touch uppercase"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="ONGOING">ONGOING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              {/* Image URL */}
              <div>
                <label htmlFor="event-image_url" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Poster Image URL (Optional)
                </label>
                <input
                  id="event-image_url"
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 min-h-touch"
                />
              </div>

              {/* Deskripsi */}
              <div className="md:col-span-2">
                <label htmlFor="event-description" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Event Description *
                </label>
                <textarea
                  id="event-description"
                  required
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide concert details, tour info, and rules..."
                  className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="px-6 py-3 border border-mono-dark-grey text-[#CCCCCC] font-bold uppercase hover:border-white hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-white text-black font-bold uppercase border-2 border-white hover:bg-transparent hover:text-white transition-colors"
              >
                {activeView === 'create' ? 'Save Event' : 'Update Event'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

    </div>
  );
}
