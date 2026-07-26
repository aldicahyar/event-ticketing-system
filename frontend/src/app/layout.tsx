import type { Metadata } from 'next';
import { Inter, Oswald, Space_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/Providers';
import NextTopLoader from 'nextjs-toploader';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const oswald = Oswald({ 
  subsets: ['latin'], 
  variable: '--font-oswald',
  weight: ['700'] 
});
const spaceMono = Space_Mono({ 
  weight: ['400', '700'], 
  subsets: ['latin'], 
  variable: '--font-space-mono' 
});

export const metadata: Metadata = {
  title: 'Event Ticketing System',
  description: 'Production-ready event ticketing platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${oswald.variable} ${spaceMono.variable} font-mono bg-black text-white`}>
        {/*
          Top loading bar: appears on every route change.
          - 200ms delay before showing (prevents flicker on fast navigations)
          - 1.2s trickle speed (feels instant but stays visible if slow)
          - White on dark theme (matches brand)
        */}
        <NextTopLoader
          color="#ffffff"
          showSpinner={false}
          crawl={true}
          crawlSpeed={200}
          initialPosition={0.08}
          height={2}
          easing="ease-in-out"
          speed={200}
          shadow="0 0 8px rgba(255,255,255,0.5), 0 0 4px rgba(255,255,255,0.4)"
          template='<div class="bar" role="bar"><div class="peg"></div></div>'
        />
        <Providers>
          <a href="#main-content" className="skip-to-content">
            Skip to content
          </a>
          <main id="main-content" tabIndex={-1}>{children}</main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
