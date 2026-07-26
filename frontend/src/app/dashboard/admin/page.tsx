'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /dashboard/admin redirects to the default admin landing page (Stats).
 * Keeps the sidebar parent link functional without rendering content here.
 */
export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/admin/stats');
  }, [router]);
  return null;
}
