/**
 * Represents the rendered content of an email ready for delivery.
 * Every template builder must return this shape.
 */
export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * Input data for the payment-success email template.
 */
export interface PaymentSuccessEmailData {
  bookingCode: string;
  eventName: string;
  customerName: string;
  totalAmount: number;
  currency: string;
  seatCount: number;
  seats: string[];
  eventDate: string | null;
  venueName: string | null;
  venueCity: string | null;
  ticketUrl: string;
}

/**
 * Input data for the payment-refunded email template.
 */
export interface PaymentRefundedEmailData {
  bookingCode: string;
  eventName: string;
  customerName: string;
  refundAmount: number;
  currency: string;
  refundId: string | null;
  refundStatus: string;
  reason: string;
}

/**
 * Input data for the booking-cancelled email template.
 */
export interface BookingCancelledEmailData {
  bookingCode: string;
  eventName: string;
  customerName: string;
  reason: string;
  description: string;
  cancelledByAdmin: boolean;
  adminEmail: string | null;
  cancelledAt: string;
}

/** Input for refund request lifecycle notifications. */
export interface DisputeOpenedEmailData {
  disputeId: string;
  bookingCode: string;
  reason: string;
  amount: number;
  currency: string;
  deadline: string | null;
  link: string;
}

export interface RefundStatusEmailData {
  bookingCode: string;
  eventName: string;
  customerName: string;
  refundAmount: number;
  currency: string;
  status: string;
  note?: string;
}
