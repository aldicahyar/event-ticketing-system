'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, CreditCard, Smartphone, 
  Lock, Shield, User, Mail, Phone, MapPin,
  Ticket, Calendar, ChevronRight, AlertTriangle, Loader2
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency';
import 'react-phone-number-input/style.css';
import PhoneInput, { parsePhoneNumber } from 'react-phone-number-input';

// Checkout Steps
const STEPS = ['Review', 'Details', 'Payment', 'Confirmation'];

function CheckoutContent() {
  const searchParams = useSearchParams();

  const event_id = searchParams.get('event');
  const seatsParam = searchParams.get('seats');
  const totalParam = searchParams.get('total');
  const subtotalParam = searchParams.get('subtotal');
  const ppnParam = searchParams.get('ppn');
  const ppnPercentParam = searchParams.get('ppn_percent');
  const currencyParam = searchParams.get('currency');

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  // Set when the backend answers 409 (a checkout for this selection is already
  // in flight). Shown as an informational notice, not an error, while we poll
  // for the existing session instead of creating a second one.
  const [conflictNotice, setConflictNotice] = useState('');

  // Form data
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: ''
  });

  // Parse seats
  const seats = seatsParam?.split(',') || [];
  
  // Price breakdown variables
  const total = Number.parseFloat(totalParam || '0');
  const subtotalVal = Number.parseFloat(subtotalParam || '0');
  const ppnVal = Number.parseFloat(ppnParam || '0');
  const ppn_percent = Number.parseFloat(ppnPercentParam || '11');

  const hasCalculatedParams = subtotalParam && ppnParam;
  const finalSubtotal = hasCalculatedParams ? subtotalVal : total / (1 + ppn_percent / 100);
  const finalPpn = hasCalculatedParams ? ppnVal : total - finalSubtotal;
  const finalTotal = total;
  const displayCurrency = currencyParam || DEFAULT_CURRENCY;

  const [eventData, setEventData] = useState<any>(null);
  const router = useRouter();

  // ── Pending-checkout guard ──────────────────────────────────────
  // Detects when a user returns to this page via the browser back button
  // from Stripe Hosted Checkout. When a `pendingCheckout` entry exists in
  // localStorage, it means the user was redirected to Stripe but came back
  // without completing payment. We validate the session status server-side
  // via /payments/recover-session and redirect to /checkout/pending so the
  // user lands on the "Payment Incomplete" page instead of seeing the
  // checkout form again (which would be confusing and could create a
  // duplicate booking).
  //
  // Flow:
  //   1. Read pendingCheckout from localStorage
  //   2. Call recover-session to check live status
  //   3. If pending/new_session → redirect to /checkout/pending
  //   4. If confirmed → redirect to /checkout/success
  //   5. If expired → clear stale localStorage, let user start fresh
  type GuardState =
    | { state: 'idle' }
    | { state: 'checking' }
    | { state: 'redirecting'; message: string };
  const [pendingGuard, setPendingGuard] = useState<GuardState>({ state: 'idle' });

  useEffect(() => {
    let cancelled = false;
    async function checkPendingCheckout() {
      let bookingId: string | null = null;
      try {
        const raw = localStorage.getItem('pendingCheckout');
        if (raw) {
          const pending = JSON.parse(raw);
          if (pending?.booking_id) bookingId = pending.booking_id;
        }
      } catch {
        // Corrupt localStorage entry — clear it so it doesn't interfere.
        try { localStorage.removeItem('pendingCheckout'); } catch { /* noop */ }
      }

      if (!bookingId) {
        if (!cancelled) setPendingGuard({ state: 'idle' });
        return;
      }

      if (!cancelled) setPendingGuard({ state: 'checking' });

      try {
        const res = await apiClient.post<{
          status: 'confirmed' | 'expired' | 'pending' | 'new_session';
        }>('/payments/recover-session', { booking_id: bookingId });

        if (cancelled) return;

        const status = res?.status;
        if (status === 'pending' || status === 'new_session') {
          // Session is still active — redirect to the "Payment Incomplete" page.
          if (!cancelled) {
            setPendingGuard({
              state: 'redirecting',
              message: 'An unfinished payment was detected. Redirecting you to resume checkout…',
            });
            window.setTimeout(() => {
              if (!cancelled) router.replace(`/checkout/pending?booking=${bookingId}`);
            }, 1500);
          }
        } else if (status === 'confirmed') {
          // Payment already succeeded — redirect to success page.
          if (!cancelled) {
            router.replace(`/checkout/success?session_id=${bookingId}`);
          }
        } else {
          // expired — clear stale localStorage so the user can start fresh.
          try { localStorage.removeItem('pendingCheckout'); } catch { /* noop */ }
          if (!cancelled) setPendingGuard({ state: 'idle' });
        }
      } catch {
        // API call failed (network error, 401, etc.) — don't block the user
        // from using the checkout page. Clear stale entry and proceed.
        try { localStorage.removeItem('pendingCheckout'); } catch { /* noop */ }
        if (!cancelled) setPendingGuard({ state: 'idle' });
      }
    }
    checkPendingCheckout();
    return () => { cancelled = true; };
  }, [router]);

  React.useEffect(() => {
    if (event_id) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      fetch(`${apiUrl}/events/${event_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setEventData(data.data);
          }
        })
        .catch(err => console.error("Failed to fetch event", err));
    }
  }, [event_id]);

  React.useEffect(() => {
    // 1. Instant fallback from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setFormData(prev => ({
          ...prev,
          firstName: user.name?.split(' ')[0] || prev.firstName,
          lastName: user.name?.split(' ').slice(1).join(' ') || prev.lastName,
          email: user.email || prev.email,
        }));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }

    // 2. Fetch fresh profile data to get the phone number
    const fetchFreshProfile = async () => {
      try {
        if (apiClient.isAuthenticated()) {
          const freshUser = await apiClient.getMe();
          setFormData(prev => ({
            ...prev,
            firstName: freshUser.name?.split(' ')[0] || prev.firstName,
            lastName: freshUser.name?.split(' ').slice(1).join(' ') || prev.lastName,
            email: freshUser.email || prev.email,
            phone: freshUser.profile?.phone
              ? parsePhoneNumber(freshUser.profile.phone, 'ID')?.number || ''
              : prev.phone,
          }));
        }
      } catch (e) {
        console.error("Failed to fetch fresh user profile", e);
      }
    };
    
    fetchFreshProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhoneChange = (value?: string) => {
    setFormData({
      ...formData,
      phone: value || ''
    });
  };

  const nextStep = () => {
    setErrorMsg('');
    if (currentStep === 1) {
      // Validate Details
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.phone.trim()) {
        setErrorMsg("Please fill in all your details before continuing.");
        return;
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setErrorMsg("Please enter a valid email address.");
        return;
      }
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setErrorMsg('');
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Handle an HTTP 409 from /bookings/checkout. A conflict means an identical
   * checkout is already in flight (double-submit or a concurrent tab), so
   * creating another one would risk a duplicate charge. Instead of surfacing a
   * raw error we poll the server for the existing resumable session and send
   * the user there once it appears.
   */
  const resolveCheckoutConflict = async (message: string) => {
    setConflictNotice(
      message || 'Your payment is already being processed. Please wait a moment…'
    );

    const MAX_ATTEMPTS = 5;
    const DELAY_MS = 2000;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      try {
        const sessions = await apiClient.get<
          Array<{ booking_id: string; event_id: string }>
        >('/payments/pending-sessions');
        const match = sessions?.find((s) => s.event_id === event_id);
        if (match) {
          router.replace(`/checkout/pending?booking=${match.booking_id}`);
          return;
        }
      } catch {
        // Polling failure is not fatal — keep trying until attempts run out.
      }
    }

    setConflictNotice('');
    setErrorMsg(
      'A previous checkout for these seats is still being processed. Please check your orders before trying again.'
    );
    setLoading(false);
  };

  const handlePayment = async () => {
    setLoading(true);
    setErrorMsg('');
    setConflictNotice('');

    try {
      // 1. Get Token from local storage (assuming auth is stored here)
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) {
        setErrorMsg('You must be logged in to checkout. Please login first.');
        setLoading(false);
        return;
      }

      // 2. Call backend API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/bookings/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          event_id: event_id,
          seatIds: seats,
          guest_name: `${formData.firstName} ${formData.lastName}`.trim(),
          guest_email: formData.email,
          guest_phone: formData.phone
        })
      });

      const data = await response.json();

      if (response.status === 409) {
        // Duplicate in-flight checkout — resume the existing one instead of
        // creating a second booking/session.
        await resolveCheckoutConflict(data?.message ?? '');
        return;
      }

      if (!response.ok) {
        throw new Error(data?.message || 'Checkout failed. Please try again.');
      }

      // 3. Persist checkout context to localStorage BEFORE redirecting to
      // Stripe. If the user closes the Stripe tab without paying (intentional
      // or due to a browser crash / connection drop), the /checkout/pending
      // page reads this entry to display a "Continue Payment" button and
      // poll the backend for the live session status.
      const checkoutData = data.data;
      if (!checkoutData?.checkoutUrl) {
        // Backend returned success but no checkout URL — this means the
        // Stripe session was not created. Show a clear error instead of
        // silently failing (which made it appear as if Stripe "disappeared").
        throw new Error(
          'Payment session could not be created. Please try again or contact support if the problem persists.'
        );
      }
      try {
        const pendingCheckout = {
          booking_id: checkoutData.booking_id,
          booking_code: checkoutData.booking_code,
          session_id: checkoutData.session_id,
          checkout_url: checkoutData.checkoutUrl,
          expires_at: checkoutData.expires_at,
          event_id: event_id,
          event_title: eventData?.title ?? '',
          total: finalTotal,
          currency: displayCurrency,
          created_at: new Date().toISOString(),
        };
        localStorage.setItem('pendingCheckout', JSON.stringify(pendingCheckout));
      } catch (e) {
        console.error('Failed to persist pending checkout context', e);
      }

      // 4. Redirect to Stripe Hosted Checkout
      window.location.href = checkoutData.checkoutUrl;

    } catch (error: any) {
      setErrorMsg(error.message || "An error occurred during checkout.");
      setLoading(false);
    }
  };

  if (!event_id || !seatsParam || !totalParam) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold uppercase mb-4">Invalid Checkout</h1>
          <p className="text-mono-light-grey mb-6">Please select tickets first.</p>
          <Link href="/events" className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wide min-h-touch inline-flex items-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  // Pending-checkout guard overlay — shown while we validate whether the user
  // has an unfinished Stripe session (e.g. they pressed the browser back button
  // from Stripe). Keeps the checkout form hidden until the check completes.
  if (pendingGuard.state === 'checking' || pendingGuard.state === 'redirecting') {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          {pendingGuard.state === 'checking' ? (
            <>
              <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-6" aria-hidden="true" />
              <h2 className="font-display font-bold text-xl uppercase mb-3">
                Checking for unfinished payments…
              </h2>
              <p className="text-mono-light-grey text-sm">
                Verifying if you have a pending checkout session.
              </p>
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <AlertTriangle className="w-8 h-8 text-black" aria-hidden="true" />
              </motion.div>
              <h2 className="font-display font-bold text-xl uppercase mb-3">
                Payment Incomplete
              </h2>
              <p className="text-mono-light-grey text-sm mb-4">
                {pendingGuard.message}
              </p>
              <div className="w-32 h-1 bg-mono-dark-grey mx-auto overflow-hidden">
                <motion.div
                  className="h-full bg-yellow-500"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      {/* Navbar */}
      <Navbar links={[]} showAuth={false} />

      {/* Secure Checkout Indicator */}
      <div className="bg-black/60 border-b border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6 py-2 flex items-center justify-center">
          <span className="flex items-center gap-2 text-xs text-mono-light-grey uppercase tracking-widest">
            <Lock className="w-3 h-3" aria-hidden="true" />
            Secure Checkout
          </span>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-black border-b border-mono-dark-grey">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-center gap-4 md:gap-8">
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center gap-2 ${
                  index === currentStep 
                    ? 'text-white' 
                    : index < currentStep 
                    ? 'text-green-500' 
                    : 'text-mono-dark-grey'
                }`}>
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === currentStep 
                      ? 'bg-white text-black' 
                      : index < currentStep 
                      ? 'bg-green-500 text-black' 
                      : 'bg-mono-dark-grey text-[#666]'
                  }`}>
                    {index < currentStep ? <CheckCircle className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" /> : index + 1}
                  </div>
                  <span className="hidden md:block uppercase text-sm font-bold">{step}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className={`w-4 h-4 mx-2 md:mx-4 ${
                    index < currentStep ? 'text-green-500' : 'text-mono-dark-grey'
                  }`} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT - Form Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              
              {/* Step 1: Review */}
              {currentStep === 0 && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-black border border-mono-dark-grey p-4 md:p-6"
                >
                  <h2 className="font-display font-bold text-xl md:text-2xl uppercase text-white mb-6">Review Your Order</h2>
                  
                  {/* Event Info */}
                  <div className="bg-white/5 p-4 mb-6">
                    <div className="flex items-start gap-3 md:gap-4">
                      <Ticket className="w-6 h-6 md:w-8 md:h-8 text-white mt-1 shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="text-xs md:text-sm text-mono-light-grey uppercase tracking-widest mb-1">Event</div>
                        <h3 className="font-display font-bold text-lg md:text-xl uppercase text-white">{eventData ? eventData.title : 'Loading...'}</h3>
                        <p className="text-[#CCCCCC] text-sm">{eventData?.subtitle || ''}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-xs md:text-sm text-[#CCCCCC]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4" aria-hidden="true" />
                            {eventData ? new Date(eventData.event_date || eventData.start_date_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '...'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 md:w-4 md:h-4" aria-hidden="true" />
                            {eventData?.venue?.name || 'Loading Venue...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Details */}
              {currentStep === 1 && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-black border border-mono-dark-grey p-4 md:p-6"
                >
                  <h2 className="font-display font-bold text-xl md:text-2xl uppercase text-white mb-6">Your Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">First Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
                        <input
                          id="firstName"
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="w-full bg-black border border-white text-white text-base px-10 py-3 min-h-touch focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 transition-colors placeholder-[#666]"
                          placeholder="JOHN"
                          autoComplete="given-name"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Last Name</label>
                      <input
                        id="lastName"
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full bg-black border border-white text-white text-base px-4 py-3 min-h-touch focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 transition-colors placeholder-[#666]"
                        placeholder="DOE"
                        autoComplete="family-name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Email</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
                        <input
                          id="email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full bg-black border border-white text-white text-base px-10 py-3 min-h-touch focus:outline-none focus:border-white/50 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 transition-colors placeholder-[#666]"
                          placeholder="john@example.com"
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2">Phone</label>
                      <div className="relative phone-input-dark">
                        <PhoneInput
                          id="phone"
                          name="phone"
                          defaultCountry="ID"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          placeholder="812 3456 7890"
                          className="w-full bg-black border border-white text-white text-base px-4 py-2 min-h-touch focus-within:border-white/50 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Payment */}
              {currentStep === 2 && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-black border border-mono-dark-grey p-4 md:p-6"
                >
                  <h2 className="font-display font-bold text-xl md:text-2xl uppercase text-white mb-6">Secure Payment</h2>
                  
                  <div className="bg-white/5 border border-mono-dark-grey p-6 text-center">
                    <Lock className="w-12 h-12 text-white mx-auto mb-4" aria-hidden="true" />
                    <h3 className="font-bold text-lg mb-2">Proceed to Stripe Checkout</h3>
                    <p className="text-mono-light-grey text-sm">
                      You will be securely redirected to Stripe to complete your payment. 
                      You can pay using Credit Card, Bank Transfer, or E-Wallet.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Confirmation */}
              {currentStep === 3 && orderComplete && (
                <motion.div
                  key="confirmation"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-black border border-green-500/50 p-6 md:p-8 text-center"
                  role="alert"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="w-16 h-16 md:w-20 md:h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-black" aria-hidden="true" />
                  </motion.div>
                  
                  <h2 className="font-display font-bold text-2xl md:text-3xl uppercase text-white mb-2">Order Confirmed!</h2>
                  <p className="text-mono-light-grey uppercase tracking-widest text-sm md:text-base mb-6">Your tickets are on the way</p>
                  
                  <div className="bg-white/5 p-4 md:p-6 mb-6 inline-block">
                    <div className="text-xs text-mono-light-grey uppercase tracking-widest mb-1">Order Number</div>
                    <div className="text-xl md:text-2xl font-display font-bold text-white tracking-widest">{orderNumber}</div>
                  </div>

                  <div className="text-left bg-white/5 p-4 mb-6">
                    <div className="grid grid-cols-2 gap-3 md:gap-4 text-sm">
                      <div>
                        <div className="text-xs text-mono-light-grey uppercase mb-1">Event</div>
                        <div className="font-bold uppercase text-xs md:text-sm">{eventData?.title || '...'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-mono-light-grey uppercase mb-1">Date</div>
                        <div className="font-bold text-xs md:text-sm">{eventData ? new Date(eventData.start_date_time).toLocaleDateString() : '...'}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs text-mono-light-grey uppercase mb-1">Tickets</div>
                        <div className="font-bold text-xs md:text-sm">{seats.length} Tickets</div>
                      </div>
                      <div>
                        <div className="text-xs text-mono-light-grey uppercase mb-1">Total Paid</div>
                        <div className="font-bold text-green-500 text-xs md:text-sm">{formatCurrency(total, displayCurrency)}</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-mono-light-grey mb-6">
                    A confirmation email has been sent to <span className="text-white">{formData.email}</span>
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/" className="px-8 py-3 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all min-h-touch inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
                      Back to Home
                    </Link>
                    <button className="px-8 py-3 bg-transparent border-2 border-mono-dark-grey text-[#CCCCCC] font-bold uppercase tracking-wide hover:border-white hover:text-white transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2" aria-label="Download Tickets">
                      Download Tickets
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* In-flight duplicate notice (HTTP 409) — informational, not an error */}
            <AnimatePresence>
              {conflictNotice && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 p-4 border-l-4 border-yellow-500 bg-yellow-500/10 text-yellow-100 text-sm font-bold tracking-wide flex items-center gap-3"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                  {conflictNotice}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 p-4 border-l-4 border-red-500 bg-red-500/10 text-red-200 text-sm font-bold tracking-wide"
                  role="alert"
                >
                  {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            {!orderComplete && (
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => { prevStep(); setErrorMsg(''); }}
                  disabled={currentStep === 0}
                  className="px-6 py-3 bg-transparent border-2 border-mono-dark-grey text-[#CCCCCC] font-bold uppercase tracking-wide hover:border-white hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  aria-label="Go back to previous step"
                >
                  Back
                </button>
                
                {currentStep < STEPS.length - 2 ? (
                  <button
                    onClick={nextStep}
                    className="px-8 py-3 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all flex items-center gap-2 min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                    aria-label="Continue to next step"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                ) : currentStep === STEPS.length - 2 ? (
                  <button
                    onClick={handlePayment}
                    disabled={loading}
                    className="px-6 md:px-8 py-3 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all flex items-center gap-2 disabled:opacity-50 min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                    aria-label={loading ? 'Processing payment' : `Pay ${formatCurrency(total, displayCurrency)}`}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin" aria-hidden="true" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" aria-hidden="true" />
                        Pay {formatCurrency(total, displayCurrency)}
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* RIGHT - Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-black border border-white p-4 md:p-6">
              <h2 className="font-display font-bold text-lg md:text-xl uppercase text-white mb-4 md:mb-6">Order Summary</h2>
              
              {/* Event */}
              <div className="pb-4 border-b border-mono-dark-grey mb-4">
                <div className="text-xs text-mono-light-grey uppercase tracking-widest mb-1">Event</div>
                <div className="font-bold uppercase text-white text-sm md:text-base">{eventData?.title || 'Loading...'}</div>
                <div className="text-xs md:text-sm text-[#CCCCCC]">
                  {eventData ? new Date(eventData.event_date || eventData.start_date_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '...'}
                </div>
              </div>

              {/* Tickets */}
              <div className="pb-4 border-b border-mono-dark-grey mb-4">
                <div className="text-xs text-mono-light-grey uppercase tracking-widest mb-2">Tickets ({seats.length})</div>
                {seats.map((seat_id) => {
                  const seatDetails = eventData?.seats?.find((s: any) => s.id === seat_id);
                  const seatLabel = seatDetails ? `${seatDetails.type} - Row ${seatDetails.row} / ${seatDetails.number}` : `${seat_id.substring(0, 8)}...`;
                  return (
                    <div key={seat_id} className="flex justify-between text-xs md:text-sm mb-1">
                      <span className="text-[#CCCCCC]">{seatLabel}</span>
                      <span className="text-white">{formatCurrency(finalSubtotal / seats.length, displayCurrency)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Price Breakdown */}
              <div className="border-b border-mono-dark-grey pb-4 mb-4 space-y-2 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-[#CCCCCC]">Subtotal</span>
                  <span className="text-white">{formatCurrency(finalSubtotal, displayCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#CCCCCC]">PPN ({ppn_percent}%)</span>
                  <span className="text-white">{formatCurrency(finalPpn, displayCurrency)}</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between text-base md:text-lg font-bold">
                <span className="text-white uppercase">Total</span>
                <span className="text-white">{formatCurrency(finalTotal, displayCurrency)}</span>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 pt-4 border-t border-mono-dark-grey space-y-3">
                <div className="flex items-center gap-3 text-xs text-[#CCCCCC]">
                  <Shield className="w-4 h-4 text-green-500" aria-hidden="true" />
                  <span>SSL Encrypted</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#CCCCCC]">
                  <Lock className="w-4 h-4 text-green-500" aria-hidden="true" />
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#CCCCCC]">
                  <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />
                  <span>Official Tickets</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white border-t-transparent animate-spin mx-auto mb-4" aria-hidden="true" />
        <p className="uppercase tracking-widest">Loading Checkout...</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutContent />
    </Suspense>
  );
}
