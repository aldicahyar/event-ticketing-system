'use client';

import { MotionConfig } from 'framer-motion';
import NextTopLoader from 'nextjs-toploader';
import { AuthProvider } from '@/contexts/AuthContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>{children}</AuthProvider>
    </MotionConfig>
  );
}

export { NextTopLoader };
