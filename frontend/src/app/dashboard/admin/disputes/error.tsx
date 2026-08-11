'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

export default function DisputesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="p-4 sm:p-6 md:p-8">
      <div role="alert" className="border border-red-400 p-6">
        <AlertCircle className="h-6 w-6 text-red-300" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-black uppercase">Dispute page failed</h1>
        <p className="mt-2 break-words text-sm text-mono-light-grey">{error.message || 'An unexpected error occurred.'}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex min-h-touch items-center gap-2 border border-white px-4 py-2 text-xs font-bold uppercase"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try Again
        </button>
      </div>
    </main>
  );
}
