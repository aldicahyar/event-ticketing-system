'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, ExternalLink, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function BillingPage() {
  const [openingPortal, setOpeningPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const handleOpenPortal = async () => {
    setOpeningPortal(true);
    setPortalError(null);
    try {
      const result = await apiClient.createPortalSession(window.location.origin + '/dashboard/billing');
      window.open(result.url, '_blank');
    } catch (err: unknown) {
      setPortalError(apiClient.getErrorMessage(err));
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold uppercase tracking-tight">
          Billing & Payment Methods
        </h1>
        <p className="text-mono-light-grey mt-2">
          Manage your billing information, invoice history, and payment methods in one place.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black border border-mono-dark-grey p-6 max-w-2xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <Wallet className="w-5 h-5 text-white" />
          <h2 className="text-xl font-display font-bold uppercase">Stripe Customer Portal</h2>
        </div>
        
        <p className="text-mono-light-grey mb-8">
          We partner with Stripe to securely handle payments and billing management. Through the Customer Portal, you can:
        </p>
        <ul className="list-disc list-inside text-mono-light-grey mb-8 space-y-2">
          <li>Add or remove payment methods (credit/debit cards).</li>
          <li>Set your default payment method.</li>
          <li>Update your billing information and address.</li>
          <li>View your full invoice history and receipts from previous purchases.</li>
        </ul>

        {portalError && (
          <div className="mb-6 p-4 border border-red-500/50 bg-red-500/10 text-red-400 text-sm">
            {portalError}
          </div>
        )}

        <button
          onClick={() => void handleOpenPortal()}
          disabled={openingPortal}
          className="w-full sm:w-auto px-6 py-3 bg-white text-black border-2 border-white font-bold uppercase tracking-wide hover:bg-transparent hover:text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {openingPortal ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Opening Portal...
            </>
          ) : (
            <>
              Open Billing Portal
              <ExternalLink className="w-4 h-4" />
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}