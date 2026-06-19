'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Users,
  Calendar,
  Star,
  Phone,
  Mail,
  Globe,
  Instagram,
  Twitter,
  Clock,
  Car,
  Navigation,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Wifi,
  Coffee,
  ShoppingBag,
  CreditCard,
  Vault,
  Shield,
  Wind,
  DoorOpen,
  Baby,
  Music,
  Accessibility,
  Bus,
  Train,
  Ticket,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/ui/Footer';
import { VenueCard } from '@/components/venues/VenueCard';
import {
  getVenueById,
  getRelatedVenues,
  VENUE_TYPE_LABELS,
  formatCapacity,
  VENUE_FACILITIES,
} from '@/lib/venues-data';

const FACILITY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Car,
  Accessibility,
  Wifi,
  Coffee,
  ShoppingBag,
  CreditCard,
  Vault,
  Shield,
  Wind,
  DoorOpen,
  Baby,
  Music,
};

const TRANSPORT_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  mrt: Train,
  rrt: Train,
  transjakarta: Bus,
  busway: Bus,
  bus: Bus,
  shuttle: Bus,
  station: Train,
  default: Navigation,
};

function getTransportIcon(label: string): React.ComponentType<{ className?: string }> {
  const lower = label.toLowerCase();
  for (const key of Object.keys(TRANSPORT_ICON_MAP)) {
    if (lower.includes(key)) return TRANSPORT_ICON_MAP[key];
  }
  return TRANSPORT_ICON_MAP.default;
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function VenueDetailPage() {
  const params = useParams<{ id: string }>();
  const venueId = params?.id ?? '';
  const venue = useMemo(() => getVenueById(venueId), [venueId]);
  const related = useMemo(() => getRelatedVenues(venueId, 3), [venueId]);

  if (!venue) {
    return (
      <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
        <Navbar
          links={[
            { href: '/events', label: 'Events' },
            { href: '/venues', label: 'Venues' },
            { href: '/help', label: 'Help' },
          ]}
        />
        <section className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center pt-20">
          <div className="border-2 border-mono-dark-grey p-8 md:p-12 max-w-md w-full">
            <AlertCircle className="w-12 h-12 text-white mx-auto mb-4" aria-hidden="true" />
            <h1 className="font-display font-bold text-3xl uppercase mb-2">Venue Not Found</h1>
            <p className="text-mono-light-grey text-sm uppercase tracking-widest mb-6">
              {"// 404_VENUE_DOES_NOT_EXIST"}
            </p>
            <Link
              href="/venues"
              className="inline-flex items-center gap-2 px-6 py-4 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Venues
            </Link>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${venue.geo.lat},${venue.geo.lng}`;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${venue.geo.lat},${venue.geo.lng}`;
  const eventsHref = `/events`;

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar
        links={[
          { href: '/events', label: 'Events' },
          { href: '/venues', label: 'Venues' },
          { href: '/help', label: 'Help' },
        ]}
      />

      {/* Back link */}
      <div className="pt-20">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <Link
            href="/venues"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-mono-light-grey hover:text-white transition-colors min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
          >
            <ArrowLeft className="w-3 h-3" aria-hidden="true" /> All Venues
          </Link>
        </div>
      </div>

      {/* Hero */}
      <motion.section
        initial="initial"
        animate="animate"
        variants={pageVariants}
        className="pb-10 md:pb-14"
        aria-labelledby="venue-title"
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="text-[10px] uppercase tracking-widest bg-white text-black px-2 py-0.5">
              {VENUE_TYPE_LABELS[venue.type]}
            </span>
            <span className="text-[10px] uppercase tracking-widest border border-mono-dark-grey text-mono-light-grey px-2 py-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" aria-hidden="true" /> {venue.city}, {venue.province}
            </span>
            <span
              className="text-[10px] uppercase tracking-widest border border-mono-dark-grey text-mono-light-grey px-2 py-0.5 flex items-center gap-1"
              aria-label={`Rating ${venue.rating} out of 5 from ${venue.reviewCount} reviews`}
            >
              <Star className="w-3 h-3" aria-hidden="true" /> {venue.rating.toFixed(1)} ({venue.reviewCount})
            </span>
            {venue.isAccessible && (
              <span className="text-[10px] uppercase tracking-widest border border-mono-dark-grey text-mono-light-grey px-2 py-0.5 flex items-center gap-1">
                <Accessibility className="w-3 h-3" aria-hidden="true" /> Wheelchair Accessible
              </span>
            )}
          </div>

          <h1
            id="venue-title"
            className="font-display font-bold text-3xl sm:text-5xl md:text-6xl uppercase text-white mb-4"
          >
            {venue.name}
          </h1>
          <p className="text-base md:text-lg text-[#CCCCCC] max-w-3xl mb-8">{venue.shortDescription}</p>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 border-t border-mono-dark-grey pt-6">
            <MetaItem
              icon={Users}
              label="Capacity"
              value={formatCapacity(venue.capacity.total)}
              hint={`${venue.capacity.seated.toLocaleString()} seated / ${venue.capacity.standing.toLocaleString()} standing`}
            />
            <MetaItem icon={Calendar} label="Upcoming" value={String(venue.upcomingEventsCount)} hint="Events" />
            <MetaItem
              icon={Clock}
              label="Established"
              value={String(venue.established)}
              hint={`${new Date().getFullYear() - venue.established} years`}
            />
            <MetaItem icon={Car} label="Parking" value={venue.parkingSpots.toLocaleString()} hint="Spots" />
          </div>

          {/* Customer-facing CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <Link
              href={eventsHref}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              View Upcoming Events <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <a
              href={directionsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-4 bg-transparent text-white font-bold uppercase tracking-wide hover:bg-white hover:text-black border-2 border-mono-dark-grey hover:border-white transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              <Navigation className="w-4 h-4" aria-hidden="true" /> Get Directions
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      </motion.section>

      {/* Gallery */}
      <section className="border-y border-mono-dark-grey" aria-label="Venue gallery">
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venue.images.map((img, i) => (
              <figure
                key={i}
                className={`relative aspect-[16/9] overflow-hidden bg-mono-dark-grey ${venue.images.length === 1 ? 'md:col-span-2' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt} className="w-full h-full object-cover" loading="lazy" />
                {img.caption && (
                  <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 text-xs text-white uppercase tracking-widest">
                    {img.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Body: about + sidebar */}
      <section className="py-12 md:py-16 border-b border-mono-dark-grey" aria-label="Venue details">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
            {/* Left */}
            <div className="lg:col-span-2 space-y-12">
              {/* About */}
              <motion.div variants={staggerItem} initial="initial" whileInView="animate" viewport={{ once: true }}>
                <h2 className="font-display font-bold text-xl md:text-2xl uppercase text-white mb-4">
                  About This Venue
                </h2>
                <p className="text-sm md:text-base text-[#CCCCCC] leading-relaxed">{venue.description}</p>
              </motion.div>

              {/* Facilities & Amenities */}
              <motion.div variants={staggerItem} initial="initial" whileInView="animate" viewport={{ once: true }}>
                <h2 className="font-display font-bold text-xl md:text-2xl uppercase text-white mb-2">
                  Facilities &amp; Amenities
                </h2>
                <p className="text-xs text-mono-light-grey uppercase tracking-widest mb-6">
                  {"// WHAT_TO_EXPECT_ON_SITE"}
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {venue.facilities.map((facId) => {
                    const facility = VENUE_FACILITIES.find((f) => f.icon === facId);
                    if (!facility) return null;
                    const Icon = FACILITY_ICON_MAP[facility.icon] ?? CheckCircle;
                    return (
                      <li
                        key={facId}
                        className="flex items-center gap-3 text-sm text-white border border-mono-dark-grey px-4 py-3 min-h-touch"
                      >
                        <Icon className="w-4 h-4 shrink-0 text-white" aria-hidden="true" />
                        <span>{facility.label}</span>
                        <CheckCircle className="w-3 h-3 ml-auto text-mono-light-grey shrink-0" aria-hidden="true" />
                      </li>
                    );
                  })}
                </ul>
              </motion.div>

              {/* Location & Address */}
              <motion.div variants={staggerItem} initial="initial" whileInView="animate" viewport={{ once: true }}>
                <h2 className="font-display font-bold text-xl md:text-2xl uppercase text-white mb-2">
                  Location
                </h2>
                <p className="text-xs text-mono-light-grey uppercase tracking-widest mb-6">
                  {"// FIND_US"}
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 border border-mono-dark-grey p-4">
                    <MapPin className="w-5 h-5 text-white mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-sm text-white font-bold">{venue.name}</p>
                      <p className="text-sm text-[#CCCCCC]">
                        {venue.address}, {venue.city}, {venue.province} {venue.postalCode}
                      </p>
                      <p className="text-xs text-mono-light-grey mt-1 font-mono">
                        {venue.geo.lat.toFixed(4)}, {venue.geo.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  {/* Map placeholder */}
                  <div
                    className="aspect-[16/9] bg-mono-dark-grey border border-mono-dark-grey flex items-center justify-center relative overflow-hidden"
                    role="img"
                    aria-label={`Map placeholder for ${venue.name} at coordinates ${venue.geo.lat}, ${venue.geo.lng}`}
                  >
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage:
                          'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                      }}
                      aria-hidden="true"
                    />
                    <div className="relative text-center px-4">
                      <MapPin className="w-8 h-8 text-white mx-auto mb-2" aria-hidden="true" />
                      <p className="text-xs uppercase tracking-widest text-mono-light-grey mb-3">
                        Interactive map coming soon
                      </p>
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white border border-mono-dark-grey hover:border-white px-4 py-2 transition-colors min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                      >
                        Open in Google Maps <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Getting Here / Transportation */}
              <motion.div variants={staggerItem} initial="initial" whileInView="animate" viewport={{ once: true }}>
                <h2 className="font-display font-bold text-xl md:text-2xl uppercase text-white mb-2">
                  Getting Here
                </h2>
                <p className="text-xs text-mono-light-grey uppercase tracking-widest mb-6">
                  {"// TRANSPORTATION_OPTIONS"}
                </p>

                <div className="space-y-4">
                  {/* Public transport */}
                  {venue.publicTransport.length > 0 && (
                    <div className="border border-mono-dark-grey p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Bus className="w-5 h-5 text-white" aria-hidden="true" />
                        <h3 className="font-bold uppercase text-sm tracking-wide text-white">Public Transport</h3>
                      </div>
                      <p className="text-xs text-mono-light-grey mb-4">
                        Nearby stations and transit stops within walking distance:
                      </p>
                      <ul className="space-y-2">
                        {venue.publicTransport.map((pt) => {
                          const Icon = getTransportIcon(pt);
                          return (
                            <li key={pt} className="flex items-center gap-3 text-sm text-white">
                              <span className="w-9 h-9 border border-mono-dark-grey flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4" aria-hidden="true" />
                              </span>
                              <span>{pt}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Parking */}
                  <div className="border border-mono-dark-grey p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Car className="w-5 h-5 text-white" aria-hidden="true" />
                      <h3 className="font-bold uppercase text-sm tracking-wide text-white">Parking</h3>
                    </div>
                    <p className="text-sm text-[#CCCCCC]">
                      <span className="text-white font-bold">{venue.parkingSpots.toLocaleString()}</span> on-site
                      parking spots available. Arrive early on event days — parking typically opens 2 hours before
                      doors.
                    </p>
                    <p className="text-xs text-mono-light-grey mt-2">
                      {"// RIDE_HAIL_DROP_OFF_ZONES_AVAILABLE_AT_MAIN_ENTRANCE"}
                    </p>
                  </div>

                  {/* Accessibility */}
                  {venue.isAccessible && (
                    <div className="border border-mono-dark-grey p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Accessibility className="w-5 h-5 text-white" aria-hidden="true" />
                        <h3 className="font-bold uppercase text-sm tracking-wide text-white">Accessibility</h3>
                      </div>
                      <p className="text-sm text-[#CCCCCC]">
                        Venue is wheelchair accessible with designated seating areas, accessible restrooms, and
                        step-free routes from drop-off points. Contact the venue in advance to arrange assistance.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Right: sidebar */}
            <aside className="lg:col-span-1">
              <div className="lg:sticky lg:top-24 space-y-4">
                {/* Quick facts */}
                <div className="border border-mono-dark-grey p-6 bg-black">
                  <h2 className="font-bold uppercase text-xs tracking-widest text-mono-light-grey mb-4">
                    Quick Facts
                  </h2>
                  <dl className="space-y-3 text-sm">
                    <SummaryRow label="Type" value={VENUE_TYPE_LABELS[venue.type]} />
                    <SummaryRow label="Capacity" value={`${venue.capacity.total.toLocaleString()} max`} />
                    <SummaryRow label="Seated" value={venue.capacity.seated.toLocaleString()} />
                    <SummaryRow label="Standing" value={venue.capacity.standing.toLocaleString()} />
                    <SummaryRow label="Parking" value={`${venue.parkingSpots.toLocaleString()} spots`} />
                    <SummaryRow label="Established" value={String(venue.established)} />
                    <SummaryRow label="Past Events" value={String(venue.pastEventsCount)} />
                  </dl>
                </div>

                {/* Upcoming events CTA */}
                <div className="border-2 border-white p-6 bg-white/5">
                  <Ticket className="w-6 h-6 text-white mb-3" aria-hidden="true" />
                  <h2 className="font-display font-bold text-lg uppercase text-white mb-2">
                    {venue.upcomingEventsCount} Upcoming {venue.upcomingEventsCount === 1 ? 'Event' : 'Events'}
                  </h2>
                  <p className="text-xs text-mono-light-grey mb-4">
                    Browse tickets for upcoming shows and performances at this venue.
                  </p>
                  <Link
                    href={eventsHref}
                    className="block text-center px-6 py-4 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    Browse Events
                  </Link>
                </div>

                {/* Contact */}
                <div className="border border-mono-dark-grey p-6">
                  <h2 className="font-bold uppercase text-xs tracking-widest text-mono-light-grey mb-4">
                    Venue Contact
                  </h2>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-mono-light-grey shrink-0" aria-hidden="true" />
                      <a
                        href={`tel:${venue.contact.phone.replace(/\s/g, '')}`}
                        className="text-white hover:underline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                      >
                        {venue.contact.phone}
                      </a>
                    </li>
                    <li className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-mono-light-grey shrink-0" aria-hidden="true" />
                      <a
                        href={`mailto:${venue.contact.email}`}
                        className="text-white hover:underline break-all focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                      >
                        {venue.contact.email}
                      </a>
                    </li>
                    {venue.contact.website && (
                      <li className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-mono-light-grey shrink-0" aria-hidden="true" />
                        <a
                          href={venue.contact.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:underline break-all focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                        >
                          Official Website
                        </a>
                      </li>
                    )}
                  </ul>
                  {venue.social && (
                    <div className="mt-4 pt-4 border-t border-mono-dark-grey flex gap-3">
                      {venue.social.instagram && (
                        <a
                          href={`https://instagram.com/${venue.social.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${venue.name} on Instagram: ${venue.social.instagram}`}
                          className="text-mono-light-grey hover:text-white transition-colors min-w-touch min-h-touch flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                        >
                          <Instagram className="w-5 h-5" aria-hidden="true" />
                        </a>
                      )}
                      {venue.social.twitter && (
                        <a
                          href={`https://twitter.com/${venue.social.twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${venue.name} on Twitter: ${venue.social.twitter}`}
                          className="text-mono-light-grey hover:text-white transition-colors min-w-touch min-h-touch flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                        >
                          <Twitter className="w-5 h-5" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Related venues */}
      {related.length > 0 && (
        <section className="py-16 md:py-20 border-b border-mono-dark-grey" aria-labelledby="related-venues-heading">
          <div className="container mx-auto px-4 md:px-6">
            <h2
              id="related-venues-heading"
              className="font-display font-bold text-2xl md:text-3xl uppercase text-white mb-8"
            >
              Similar Venues
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((v) => (
                <VenueCard key={v.id} venue={v} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

/* ---------- helpers ---------- */

function MetaItem({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-mono-light-grey mb-1">
        <Icon className="w-3 h-3" aria-hidden="true" />
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-base md:text-lg text-white font-bold">{value}</p>
      {hint && <p className="text-[10px] text-mono-dark-grey uppercase">{hint}</p>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-mono-dark-grey pb-2 last:border-b-0 last:pb-0">
      <dt className="text-[10px] uppercase tracking-widest text-mono-light-grey shrink-0">{label}</dt>
      <dd className="text-sm text-white text-right font-bold">{value}</dd>
    </div>
  );
}
