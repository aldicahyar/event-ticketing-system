import { motion } from 'framer-motion';
import Link from 'next/link';
import { MapPin, Users, Star, ArrowRight } from 'lucide-react';
import { Venue, VENUE_TYPE_LABELS, formatCapacity } from '@/lib/venues-data';

const cardHover = {
  rest: { y: 0 },
  hover: { y: -6, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const } },
};

export function VenueCard({ venue }: Readonly<{ venue: Venue }>) {
  return (
    <motion.div variants={cardHover} initial="rest" whileHover="hover" className="h-full">
      <Link
        href={`/venues/${venue.slug}`}
        className="group block bg-black border border-mono-dark-grey hover:border-white transition-colors duration-300 h-full focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-mono-dark-grey">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={venue.images[0]?.url}
            alt={venue.images[0]?.alt ?? venue.name}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
            loading="lazy"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-hidden="true"
          />
          <span className="absolute top-3 left-3 text-[10px] uppercase tracking-widest bg-white text-black px-2 py-0.5">
            {VENUE_TYPE_LABELS[venue.type]}
          </span>
          {venue.upcomingEventsCount > 0 && (
            <span className="absolute top-3 right-3 text-[10px] uppercase tracking-widest bg-black/80 border border-white text-white px-2 py-0.5">
              {venue.upcomingEventsCount} upcoming
            </span>
          )}
        </div>
        <div className="p-4 md:p-5">
          <h3 className="font-display font-bold text-lg uppercase text-white mb-2 group-hover:underline">
            {venue.name}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-mono-light-grey mb-3">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" aria-hidden="true" /> {venue.city}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" aria-hidden="true" /> {formatCapacity(venue.capacity.total)}
            </span>
            <span className="flex items-center gap-1" aria-label={`Rating ${venue.rating} out of 5`}>
              <Star className="w-3 h-3" aria-hidden="true" /> {venue.rating.toFixed(1)}
            </span>
          </div>
          <p className="text-xs text-[#CCCCCC] line-clamp-2 mb-4">{venue.shortDescription}</p>
          <div className="flex items-center gap-1 text-xs uppercase tracking-widest text-white transition-all">
            <span>View Venue</span>
            <ArrowRight
              className="w-3 h-3 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300"
              aria-hidden="true"
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
