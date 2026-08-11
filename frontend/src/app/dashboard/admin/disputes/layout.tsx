import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dispute Management | EventTicket',
  description: 'Admin chargeback dispute and Stripe evidence management.',
};

export default function DisputesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
