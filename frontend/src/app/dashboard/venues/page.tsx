'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Shield, MapPin, Plus, Edit2, Trash2, ArrowLeft
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  capacity: number;
  seat_map?: {
    rows?: number;
    seatsPerRow?: number;
  };
  description?: string;
  image_url?: string;
}

const DEFAULT_FORM = {
  id: '',
  name: '',
  address: '',
  city: '',
  country: '',
  capacity: '100',
  rows: '10',
  seatsPerRow: '10',
  description: '',
  image_url: ''
};

export default function VenuesManagementPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
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

  const fetchVenues = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await apiClient.get<Venue[]>('/venues');
      setVenues(data || []);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleOpenCreate = () => {
    setFormData(DEFAULT_FORM);
    setError('');
    setSuccessMessage('');
    setActiveView('create');
  };

  const handleOpenEdit = (venue: Venue) => {
    setError('');
    setSuccessMessage('');
    
    // Parse seat_map jika ada
    const rows = venue.seat_map?.rows || 10;
    const seatsPerRow = venue.seat_map?.seatsPerRow || 10;

    setFormData({
      id: venue.id,
      name: venue.name,
      address: venue.address,
      city: venue.city,
      country: venue.country,
      capacity: String(venue.capacity),
      rows: String(rows),
      seatsPerRow: String(seatsPerRow),
      description: venue.description || '',
      image_url: venue.image_url || ''
    });
    setActiveView('edit');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validasi sederhana
    if (!formData.name || !formData.address || !formData.city || !formData.country) {
      setError('Please fill in all required fields.');
      return;
    }

    const seat_map = {
      rows: Number(formData.rows),
      seatsPerRow: Number(formData.seatsPerRow),
      layout: 'STADIUM'
    };

    const payload = {
      name: formData.name,
      address: formData.address,
      city: formData.city,
      country: formData.country,
      capacity: Number(formData.capacity),
      seat_map,
      description: formData.description || undefined,
      image_url: formData.image_url || undefined
    };

    try {
      if (activeView === 'create') {
        await apiClient.post('/venues/create', payload);
        setSuccessMessage(`Venue "${formData.name}" created successfully!`);
      } else {
        await apiClient.post('/venues/update', { id: formData.id, ...payload });
        setSuccessMessage(`Venue "${formData.name}" updated successfully!`);
      }
      fetchVenues();
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
      await apiClient.post('/venues/delete', { id });
      setSuccessMessage('Venue deleted successfully!');
      fetchVenues();
      setDeletingId(null);
    } catch (err) {
      setError(apiClient.getErrorMessage(err));
    }
  };

  // Memecah ternary bertumpuk untuk rendering daftar venue
  const renderVenuesContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12 border border-mono-dark-grey text-mono-light-grey">
          Loading venues data...
        </div>
      );
    }

    if (venues.length === 0) {
      return (
        <div className="text-center py-12 border border-mono-dark-grey">
          <MapPin className="w-12 h-12 text-mono-dark-grey mx-auto mb-4" />
          <h3 className="font-bold uppercase text-white mb-2">No venues configured</h3>
          <p className="text-mono-light-grey text-sm mb-4">
            Click &quot;Add Venue&quot; to configure your first event venue.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto border border-mono-dark-grey">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-mono-dark-grey bg-white/5 uppercase text-xs">
              <th className="p-3 border-r border-mono-dark-grey font-bold">Venue Name</th>
              <th className="p-3 border-r border-mono-dark-grey font-bold">Location</th>
              <th className="p-3 border-r border-mono-dark-grey font-bold">Capacity</th>
              <th className="p-3 font-bold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mono-dark-grey">
            {venues.map((venue) => (
              <tr key={venue.id} className="hover:bg-white/5 transition-colors">
                <td className="p-3 border-r border-mono-dark-grey font-bold uppercase">
                  {venue.name}
                </td>
                <td className="p-3 border-r border-mono-dark-grey text-sm text-[#CCCCCC]">
                  {venue.address}, {venue.city}, {venue.country}
                </td>
                <td className="p-3 border-r border-mono-dark-grey font-bold">
                  {venue.capacity.toLocaleString()} seats
                </td>
                <td className="p-3">
                  {deletingId === venue.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[10px] text-red-500 font-bold uppercase">Confirm?</span>
                      <button
                        onClick={() => handleDelete(venue.id)}
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
                        onClick={() => handleOpenEdit(venue)}
                        className="p-2 border border-mono-dark-grey hover:border-white transition-colors"
                        aria-label={`Edit ${venue.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(venue.id)}
                        className="p-2 border border-mono-dark-grey hover:border-red-500 hover:text-red-500 transition-colors"
                        aria-label={`Delete ${venue.name}`}
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
            Manage <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }}>Venues</span>
          </h1>
          <p className="text-mono-light-grey uppercase tracking-widest text-xs md:text-sm">
            {'// CONFIGURE_CONCERT_HALLS_AND_STADIUMS'}
          </p>
        </div>
        {activeView === 'list' && (
          <button
            onClick={handleOpenCreate}
            className="self-start sm:self-auto px-6 py-3 bg-white text-black font-bold uppercase tracking-wider hover:bg-black hover:text-white border-2 border-white transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add Venue
          </button>
        )}
      </div>

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

      {/* Tampilan 1: LIST VENUES */}
      {activeView === 'list' && renderVenuesContent()}

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
              {activeView === 'create' ? 'Create New Venue' : 'Edit Venue Details'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nama Venue */}
              <div className="md:col-span-2">
                <label htmlFor="venue-name" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Venue Name *
                </label>
                <input
                  id="venue-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. TENNIS INDOOR SENAYAN"
                  className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch"
                />
              </div>

              {/* Alamat */}
              <div className="md:col-span-2">
                <label htmlFor="venue-address" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Address *
                </label>
                <input
                  id="venue-address"
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. JL. PINTU SATU SENAYAN"
                  className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch"
                />
              </div>

              {/* Kota */}
              <div>
                <label htmlFor="venue-city" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  City *
                </label>
                <input
                  id="venue-city"
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. SENAYAN"
                  className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch"
                />
              </div>

              {/* Negara */}
              <div>
                <label htmlFor="venue-country" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Country *
                </label>
                <input
                  id="venue-country"
                  type="text"
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g. INDONESIA"
                  className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch"
                />
              </div>

              {/* Kapasitas Maksimal */}
              <div>
                <label htmlFor="venue-capacity" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Max Capacity (Seats) *
                </label>
                <input
                  id="venue-capacity"
                  type="number"
                  required
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch"
                />
              </div>

              {/* Peta Tempat Duduk (Seat Map) */}
              <div className="p-4 bg-white/5 border border-mono-dark-grey space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-mono-light-grey" /> Seat Map Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="venue-rows" className="block text-[10px] text-mono-light-grey uppercase mb-1">Rows *</label>
                    <input
                      id="venue-rows"
                      type="number"
                      required
                      min="1"
                      value={formData.rows}
                      onChange={(e) => setFormData({ ...formData, rows: e.target.value })}
                      className="w-full bg-black border border-white text-white px-3 py-2 text-sm focus:outline-none focus:border-white/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="venue-seats-per-row" className="block text-[10px] text-mono-light-grey uppercase mb-1">Seats/Row *</label>
                    <input
                      id="venue-seats-per-row"
                      type="number"
                      required
                      min="1"
                      value={formData.seatsPerRow}
                      onChange={(e) => setFormData({ ...formData, seatsPerRow: e.target.value })}
                      className="w-full bg-black border border-white text-white px-3 py-2 text-sm focus:outline-none focus:border-white/50"
                    />
                  </div>
                </div>
                <div className="text-[10px] text-[#888] leading-normal font-mono">
                  INFO: Total seats calculated as Rows &times; Seats/Row. Layout type is defaults to STADIUM.
                </div>
              </div>

              {/* Gambar URL */}
              <div className="md:col-span-2">
                <label htmlFor="venue-image-url" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Image URL (Optional)
                </label>
                <input
                  id="venue-image-url"
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-black border border-white text-white px-4 py-3 text-base focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white min-h-touch"
                />
              </div>

              {/* Deskripsi */}
              <div className="md:col-span-2">
                <label htmlFor="venue-description" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">
                  Description
                </label>
                <textarea
                  id="venue-description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell us about the venue amenities..."
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
                {activeView === 'create' ? 'Save Venue' : 'Update Venue'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

    </div>
  );
}
