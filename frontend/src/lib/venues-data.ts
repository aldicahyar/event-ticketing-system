export type VenueType = 'stadium' | 'arena' | 'hall' | 'outdoor' | 'club' | 'theater';

export interface Facility {
  icon: string; // Lucide icon name
  label: string;
}

export interface VenueImage {
  url: string;
  alt: string;
  caption?: string;
}

export interface Venue {
  id: string;
  slug: string;
  name: string;
  type: VenueType;
  shortDescription: string;
  description: string;
  city: string;
  address: string;
  province: string;
  postalCode: string;
  capacity: {
    seated: number;
    standing: number;
    total: number;
  };
  facilities: string[]; // facility ids from VENUE_FACILITIES
  images: VenueImage[];
  // --- Backend-ready fields ---
  geo: {
    lat: number;
    lng: number;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  social?: {
    instagram?: string;
    twitter?: string;
  };
  rating: number; // 0 - 5
  reviewCount: number;
  upcomingEventsCount: number;
  pastEventsCount: number;
  isAccessible: boolean; // wheelchair
  parkingSpots: number;
  publicTransport: string[]; // nearby stations
  established: number;
}

export interface VenueListItem {
  id: string;
  slug: string;
  name: string;
  type: VenueType;
  city: string;
  capacity: number;
  image: string;
  upcomingEventsCount: number;
  rating: number;
}

export const VENUE_FACILITIES: Facility[] = [
  { icon: 'Car', label: 'Parking' },
  { icon: 'Accessibility', label: 'Wheelchair Access' },
  { icon: 'Wifi', label: 'Free WiFi' },
  { icon: 'Coffee', label: 'Food & Beverage' },
  { icon: 'ShoppingBag', label: 'Merchandise Store' },
  { icon: 'CreditCard', label: 'Card Payments' },
  { icon: 'Vault', label: 'ATM' },
  { icon: 'Shield', label: 'Security' },
  { icon: 'Wind', label: 'Air Conditioning' },
  { icon: 'DoorOpen', label: 'Coat Check' },
  { icon: 'Baby', label: 'Family Room' },
  { icon: 'Music', label: 'Premium Sound System' },
];

export const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  stadium: 'Stadium',
  arena: 'Arena',
  hall: 'Convention Hall',
  outdoor: 'Outdoor Field',
  club: 'Club / Live House',
  theater: 'Theater',
};

export const VENUE_TYPES = Object.keys(VENUE_TYPE_LABELS) as VenueType[];

export const VENUE_CAPACITY_BUCKETS = [
  { id: 'all', label: 'Any Capacity', min: 0, max: Infinity },
  { id: 'small', label: 'Up to 5,000', min: 0, max: 5000 },
  { id: 'medium', label: '5,000 - 15,000', min: 5000, max: 15000 },
  { id: 'large', label: '15,000 - 50,000', min: 15000, max: 50000 },
  { id: 'xlarge', label: '50,000+', min: 50000, max: Infinity },
];

export function formatCapacity(total: number): string {
  if (total >= 1000) {
    return `${(total / 1000).toFixed(total % 1000 === 0 ? 0 : 1)}K`;
  }
  return String(total);
}

export function getFacilityLabel(iconName: string): string {
  return VENUE_FACILITIES.find((f) => f.icon === iconName)?.label ?? iconName;
}
