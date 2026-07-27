export enum Role {
  ADMIN = 'ADMIN',
  ORGANIZER = 'ORGANIZER',
  ATTENDEE = 'ATTENDEE',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum SeatType {
  REGULAR = 'REGULAR',
  VIP = 'VIP',
  PREMIUM = 'PREMIUM',
}

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
  avatar?: string;
  createdAt: Date;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  capacity: number;
  seatMap: any;
  description?: string;
  imageUrl?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  venue: Venue;
  eventDate: Date;
  startDateTime: Date;
  endDateTime: Date;
  status: EventStatus;
  imageUrl?: string;
  basePrice: number;
  currency: string;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Seat {
  id: string;
  eventId: string;
  venueId: string;
  row: string;
  number: number;
  type: SeatType;
  status: SeatStatus;
  price: number;
  bookingId?: string;
}

export interface Booking {
  id: string;
  userId: string;
  eventId: string;
  bookingCode: string;
  totalPrice: number;
  currency: string;
  status: BookingStatus;
  expiresAt?: Date;
  bookedAt: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  seats: Seat[];
  payment?: Payment;
  tickets: Ticket[];
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  provider: string;
  providerTxId?: string;
  status: PaymentStatus;
  paymentUrl?: string;
  paidAt?: Date;
}

export interface Ticket {
  id: string;
  bookingId: string;
  seatId: string;
  qrCode: string;
  isCheckedIn: boolean;
  checkedInAt?: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  data: T;
  message?: string;
  timestamp: string;
  path: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
