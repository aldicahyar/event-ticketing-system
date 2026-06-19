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

export const VENUES: Venue[] = [
  {
    id: 'ven-1',
    slug: 'gbk-senayan',
    name: 'Gelora Bung Karno Stadium',
    type: 'stadium',
    shortDescription: "Indonesia's iconic national stadium hosting the biggest concerts and sports events.",
    description:
      'Gelora Bung Karno (GBK) is the largest and most iconic stadium in Indonesia, located in the heart of Jakarta. Recently renovated to international standards, the venue has hosted global acts including Coldplay, BTS, and Ed Sheeran. With state-of-the-art sound systems, premium VIP suites, and capacity for over 77,000 fans, GBK delivers unforgettable experiences for the largest productions touring Southeast Asia.',
    city: 'Jakarta',
    address: 'Jl. Pintu Satu Senayan, Gelora',
    province: 'DKI Jakarta',
    postalCode: '10270',
    capacity: { seated: 55000, standing: 22000, total: 77000 },
    facilities: ['Car', 'Accessibility', 'Wifi', 'Coffee', 'ShoppingBag', 'CreditCard', 'Vault', 'Shield', 'Music'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=2000&auto=format&fit=crop',
        alt: 'Gelora Bung Karno Stadium green grass pitch and running track under bright floodlights at night',
        caption: 'Stadium pitch view',
      },
      {
        url: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=2000&auto=format&fit=crop',
        alt: 'Concert crowd seen from stadium seats with colorful stage lights',
        caption: 'Concert configuration',
      },
    ],
    geo: { lat: -6.2186, lng: 106.8019 },
    contact: {
      phone: '+62 21 5723 333',
      email: 'info@gbk.id',
      website: 'https://www.gbk.id',
    },
    social: {
      instagram: '@gbk_jakarta',
      twitter: '@GBK_id',
    },
    rating: 4.7,
    reviewCount: 1842,
    upcomingEventsCount: 4,
    pastEventsCount: 318,
    isAccessible: true,
    parkingSpots: 3500,
    publicTransport: ['GBK Senayan MRT', 'Senayan TransJakarta', 'Bendungan Hilir MRT'],
    established: 1962,
  },
  {
    id: 'ven-2',
    slug: 'ice-bsd-city',
    name: 'Indonesia Convention Exhibition (ICE)',
    type: 'hall',
    shortDescription: "Southeast Asia's premier exhibition hall for music festivals, expos, and conventions.",
    description:
      'Indonesia Convention Exhibition (ICE) BSD City is a world-class venue spanning 50,000 m² of exhibition space. Known for hosting major music festivals, anime conventions, and trade shows, ICE offers flexible configurations from intimate 2,000-pax showcases to massive 20,000-pax EDM festivals. Modern amenities, modular staging, and excellent connectivity via toll roads make ICE a top choice for international promoters.',
    city: 'Tangerang',
    address: 'BSD City, Pagedangan',
    province: 'Banten',
    postalCode: '15339',
    capacity: { seated: 8000, standing: 12000, total: 20000 },
    facilities: ['Car', 'Accessibility', 'Wifi', 'Coffee', 'ShoppingBag', 'CreditCard', 'Vault', 'Shield', 'Wind', 'Music'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=2000&auto=format&fit=crop',
        alt: 'Large modern exhibition hall with high ceiling and grid lighting',
        caption: 'Main exhibition hall',
      },
    ],
    geo: { lat: -6.30015, lng: 106.63644 },
    contact: {
      phone: '+62 21 2989 7000',
      email: 'info@ice-indonesia.com',
      website: 'https://www.ice-indonesia.com',
    },
    social: {
      instagram: '@ice_bsd',
    },
    rating: 4.5,
    reviewCount: 967,
    upcomingEventsCount: 6,
    pastEventsCount: 412,
    isAccessible: true,
    parkingSpots: 5000,
    publicTransport: ['Serpong RRT', 'Cisauk RRT', 'ICE Shuttle Bus'],
    established: 2015,
  },
  {
    id: 'ven-3',
    slug: 'jcc-senayan',
    name: 'Jakarta Convention Center',
    type: 'hall',
    shortDescription: 'Historic convention center in Senayan hosting concerts, exhibitions, and corporate events.',
    description:
      'Jakarta Convention Center (JCC) is a landmark venue in Senayan with the iconic shield-shaped roofline. The complex includes the main Plenary Hall (5,000 pax) and multiple exhibition halls. JCC has been a staple of Jakarta\'s events scene since 1974, hosting everything from international conferences to K-Pop showcases.',
    city: 'Jakarta',
    address: 'Jl. Gatot Subroto, Gelora',
    province: 'DKI Jakarta',
    postalCode: '10270',
    capacity: { seated: 3500, standing: 5000, total: 8500 },
    facilities: ['Car', 'Accessibility', 'Wifi', 'Coffee', 'CreditCard', 'Vault', 'Shield', 'Wind', 'DoorOpen'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2000&auto=format&fit=crop',
        alt: 'Jakarta Convention Center main hall configured for a corporate event with stage lighting',
        caption: 'Main plenary hall interior',
      },
    ],
    geo: { lat: -6.21462, lng: 106.80753 },
    contact: {
      phone: '+62 21 5723 333',
      email: 'info@jcc.com',
      website: 'https://www.jcc.com',
    },
    rating: 4.3,
    reviewCount: 612,
    upcomingEventsCount: 2,
    pastEventsCount: 894,
    isAccessible: true,
    parkingSpots: 2000,
    publicTransport: ['JCC Senayan TransJakarta', 'Benhill MRT'],
    established: 1974,
  },
  {
    id: 'ven-4',
    slug: 'jiexpo-kemayoran',
    name: 'Jakarta International Expo',
    type: 'hall',
    shortDescription: "Indonesia's premier exhibition and convention complex in Kemayoran, hosting major concerts and expos.",
    description:
      'Jakarta International Expo (JIExpo) is a sprawling exhibition and entertainment complex in Kemayoran, Central Jakarta. Spanning over 44 hectares, the venue combines indoor exhibition halls, outdoor concert fields, and the Music Museum performance arena. JIExpo regularly hosts large-scale music festivals, trade shows, and cultural events, with flexible configurations ranging from intimate 2,000-pax showcases to massive 15,000-pax open-air concerts.',
    city: 'Jakarta',
    address: 'Jl. Benyamin Sueb No.1, Pademangan',
    province: 'DKI Jakarta',
    postalCode: '14420',
    capacity: { seated: 6000, standing: 9000, total: 15000 },
    facilities: ['Car', 'Accessibility', 'Wifi', 'Coffee', 'ShoppingBag', 'CreditCard', 'Vault', 'Shield', 'Wind', 'DoorOpen', 'Music'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=2000&auto=format&fit=crop',
        alt: 'Large modern exhibition hall with high ceiling and grid lighting at Jakarta International Expo',
        caption: 'Main exhibition hall',
      },
    ],
    geo: { lat: -6.146810372766091, lng: 106.8451315382361 },
    contact: {
      phone: '+62 21 6633 9111',
      email: 'info@jiexpo.co.id',
      website: 'https://www.jiexpo.co.id',
    },
    rating: 4.6,
    reviewCount: 751,
    upcomingEventsCount: 4,
    pastEventsCount: 632,
    isAccessible: true,
    parkingSpots: 3000,
    publicTransport: ['Kemayoran Busway', 'Pasar Baru Busway', 'Rajawali Station'],
    established: 2010,
  },
  {
    id: 'ven-5',
    slug: 'mbei-bekasi',
    name: 'Mahaka Square Bekasi',
    type: 'arena',
    shortDescription: 'Modern multi-purpose indoor arena hosting esports, music, and family shows.',
    description:
      'Mahaka Square Bekasi is a 9,000-seat indoor arena in Greater Jakarta. The venue specializes in mid-size concerts, esports tournaments, and family entertainment. Excellent sightlines throughout the bowl and a recent sound system upgrade make this one of the most versatile arenas in the region.',
    city: 'Bekasi',
    address: 'Jl. Jendral Sudirman No.1',
    province: 'West Java',
    postalCode: '17123',
    capacity: { seated: 7000, standing: 2000, total: 9000 },
    facilities: ['Car', 'Accessibility', 'Wifi', 'Coffee', 'ShoppingBag', 'CreditCard', 'Vault', 'Shield', 'Wind', 'Music'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2000&auto=format&fit=crop',
        alt: 'Indoor sports arena with bright stage lights and audience',
        caption: 'Arena bowl',
      },
    ],
    geo: { lat: -6.2349, lng: 106.9896 },
    contact: {
      phone: '+62 21 8842 1000',
      email: 'info@mahakasquare.id',
    },
    rating: 4.4,
    reviewCount: 389,
    upcomingEventsCount: 5,
    pastEventsCount: 178,
    isAccessible: true,
    parkingSpots: 1500,
    publicTransport: ['Bekasi RRT', 'Bekasi Busway'],
    established: 2019,
  },
  {
    id: 'ven-6',
    slug: 'rotterdam-rooftop',
    name: 'Rotterdam Rooftop Field',
    type: 'outdoor',
    shortDescription: 'Open-air rooftop venue in Surabaya with skyline views for sunset concerts.',
    description:
      'Rotterdam Rooftop Field is a unique open-air venue on the 7th floor of Tunjungan Plaza 6 in Surabaya. With a maximum capacity of 3,500, this venue offers breathtaking skyline views paired with spectacular sunsets, perfect for indie music, jazz, and electronic shows.',
    city: 'Surabaya',
    address: 'Jl. Embong Malang, Tegalsari',
    province: 'East Java',
    postalCode: '60261',
    capacity: { seated: 1500, standing: 2000, total: 3500 },
    facilities: ['Car', 'Accessibility', 'Wifi', 'Coffee', 'CreditCard', 'Shield', 'Music'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2000&auto=format&fit=crop',
        alt: 'Rooftop concert crowd silhouetted against a city skyline at sunset',
        caption: 'Sunset concert setup',
      },
    ],
    geo: { lat: -7.2575, lng: 112.7521 },
    contact: {
      phone: '+62 31 5454 6789',
      email: 'events@rotterdamrooftop.id',
      website: 'https://www.rotterdamrooftop.id',
    },
    social: {
      instagram: '@rotterdamrooftop',
    },
    rating: 4.6,
    reviewCount: 234,
    upcomingEventsCount: 2,
    pastEventsCount: 87,
    isAccessible: true,
    parkingSpots: 1200,
    publicTransport: ['Tunjungan Plaza Shuttle', 'Gubeng Station'],
    established: 2021,
  },
];

export const VENUE_CITIES = ['All', ...Array.from(new Set(VENUES.map((v) => v.city)))];
export const VENUE_CAPACITY_BUCKETS = [
  { id: 'all', label: 'Any Capacity', min: 0, max: Infinity },
  { id: 'small', label: 'Up to 5,000', min: 0, max: 5000 },
  { id: 'medium', label: '5,000 - 15,000', min: 5000, max: 15000 },
  { id: 'large', label: '15,000 - 50,000', min: 15000, max: 50000 },
  { id: 'xlarge', label: '50,000+', min: 50000, max: Infinity },
];

export function getVenueById(id: string): Venue | undefined {
  return VENUES.find((v) => v.id === id || v.slug === id);
}

export function getRelatedVenues(currentId: string, limit = 3): Venue[] {
  const current = getVenueById(currentId);
  if (!current) return [];
  return VENUES.filter(
    (v) => v.id !== currentId && (v.city === current.city || v.type === current.type),
  ).slice(0, limit);
}

export function formatCapacity(total: number): string {
  if (total >= 1000) {
    return `${(total / 1000).toFixed(total % 1000 === 0 ? 0 : 1)}K`;
  }
  return String(total);
}

export function getFacilityLabel(iconName: string): string {
  return VENUE_FACILITIES.find((f) => f.icon === iconName)?.label ?? iconName;
}
