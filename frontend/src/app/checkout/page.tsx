'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, CreditCard, Smartphone, 
  Lock, Shield, User, Mail, Phone, MapPin,
  Ticket, Calendar, ChevronRight
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';

// Checkout Steps
const STEPS = ['Review', 'Details', 'Payment', 'Confirmation'];

function CheckoutContent() {
  const searchParams = useSearchParams();

  const eventId = searchParams.get('event');
  const seatsParam = searchParams.get('seats');
  const totalParam = searchParams.get('total');
  const subtotalParam = searchParams.get('subtotal');
  const ppnParam = searchParams.get('ppn');
  const ppnPercentParam = searchParams.get('ppnPercent');

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Form data
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
  const ppnPercent = Number.parseFloat(ppnPercentParam || '11');

  const hasCalculatedParams = subtotalParam && ppnParam;
  const finalSubtotal = hasCalculatedParams ? subtotalVal : total / (1 + ppnPercent / 100);
  const finalPpn = hasCalculatedParams ? ppnVal : total - finalSubtotal;
  const finalTotal = total;

  const [eventData, setEventData] = useState<any>(null);

  React.useEffect(() => {
    if (eventId) {
      fetch(`http://localhost:3000/events/${eventId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setEventData(data.data);
          }
        })
        .catch(err => console.error("Failed to fetch event", err));
    }
  }, [eventId]);

  React.useEffect(() => {
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
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      // 1. Get Token from local storage (assuming auth is stored here)
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) {
        alert('You must be logged in to checkout. Please login first.');
        setLoading(false);
        return;
      }

      // 2. Call backend API
      const response = await fetch('http://localhost:3000/bookings/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          eventId: eventId,
          seatIds: seats,
          guestName: `${formData.firstName} ${formData.lastName}`.trim(),
          guestEmail: formData.email,
          guestPhone: formData.phone
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Checkout failed');
      }

      // 3. Redirect to Stripe
      if (data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      } else {
        throw new Error('Checkout URL not found from backend');
      }
      
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  if (!eventId || !seatsParam || !totalParam) {
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
                            {eventData ? new Date(eventData.eventDate || eventData.startDateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '...'}
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
                        <div className="font-bold text-xs md:text-sm">{eventData ? new Date(eventData.startDateTime).toLocaleDateString() : '...'}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs text-mono-light-grey uppercase mb-1">Tickets</div>
                        <div className="font-bold text-xs md:text-sm">{seats.length} Tickets</div>
                      </div>
                      <div>
                        <div className="text-xs text-mono-light-grey uppercase mb-1">Total Paid</div>
                        <div className="font-bold text-green-500 text-xs md:text-sm">IDR {total.toLocaleString('id-ID')}</div>
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

            {/* Navigation Buttons */}
            {!orderComplete && (
              <div className="flex justify-between mt-6">
                <button
                  onClick={prevStep}
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
                    aria-label={loading ? 'Processing payment' : `Pay IDR ${total.toLocaleString('id-ID')}`}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin" aria-hidden="true" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" aria-hidden="true" />
                        Pay IDR {total.toLocaleString('id-ID')}
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
                  {eventData ? new Date(eventData.eventDate || eventData.startDateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '...'}
                </div>
              </div>

              {/* Tickets */}
              <div className="pb-4 border-b border-mono-dark-grey mb-4">
                <div className="text-xs text-mono-light-grey uppercase tracking-widest mb-2">Tickets ({seats.length})</div>
                {seats.map((seatId) => {
                  const seatDetails = eventData?.seats?.find((s: any) => s.id === seatId);
                  const seatLabel = seatDetails ? `${seatDetails.type} - Row ${seatDetails.row} / ${seatDetails.number}` : `${seatId.substring(0, 8)}...`;
                  return (
                    <div key={seatId} className="flex justify-between text-xs md:text-sm mb-1">
                      <span className="text-[#CCCCCC]">{seatLabel}</span>
                      <span className="text-white">IDR {(finalSubtotal / seats.length).toLocaleString('id-ID')}</span>
                    </div>
                  );
                })}
              </div>

              {/* Price Breakdown */}
              <div className="border-b border-mono-dark-grey pb-4 mb-4 space-y-2 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-[#CCCCCC]">Subtotal</span>
                  <span className="text-white">IDR {finalSubtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#CCCCCC]">PPN ({ppnPercent}%)</span>
                  <span className="text-white">IDR {finalPpn.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between text-base md:text-lg font-bold">
                <span className="text-white uppercase">Total</span>
                <span className="text-white">IDR {finalTotal.toLocaleString('id-ID')}</span>
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
