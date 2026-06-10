  import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BrutalistHero } from '@/components/hero/BrutalistHero';
import { IndustrialButton } from '@/components/ui/industrial-components';
import { EventList } from '@/components/events/EventList';
import { Footer } from '@/components/ui/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-mono">
       {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-0 h-16 bg-transparent pointer-events-none">
        <div className="text-3xl font-display font-bold tracking-tight text-white uppercase select-none pointer-events-auto flex items-center gap-1">
          <div className="w-4 h-4 bg-white"></div>
          EventTicket.
         </div>
         <div className="flex items-center gap-0 pointer-events-auto">
          <Link href="/events" className="h-16 px-5 flex items-center text-sm font-semibold uppercase text-white hover:text-white relative group transition-colors">
            Events
            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></span>
           </Link>
           <Link href="/lineup" className="h-16 px-5 flex items-center text-sm font-semibold uppercase text-white hover:text-white relative group transition-colors">
            Lineup
            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></span>
           </Link>
           <Link href="/auth/login" className="h-16 px-5 flex items-center text-sm font-semibold uppercase text-white hover:text-white relative group transition-colors">
            Login
            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></span>
           </Link>
           <Link href="/auth/register" className="h-16 px-5 flex items-center text-sm font-semibold uppercase text-white hover:text-white relative group transition-colors">
            Sign Up
            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></span>
           </Link>
         </div>
       </nav>

      <BrutalistHero />
      <EventList />
      <Footer />
    </main>
  );
}
