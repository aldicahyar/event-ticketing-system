import type Stripe from 'stripe';

/**
 * Resolves the Stripe PaymentIntent ID from a Checkout Session.
 *
 * Stripe Checkout Sessions can have `payment_intent` either as a string ID
 * (when unexpanded) or as a populated `Stripe.PaymentIntent` object (when expanded).
 *
 * This function standardises extraction across all modules (payments, refunds,
 * admin ops) and eliminates duplicate implementations.
 *
 * @param session - The Stripe Checkout Session instance
 * @returns The PaymentIntent ID string if present, otherwise null.
 */
export function resolvePaymentIntentId(
  session: Pick<Stripe.Checkout.Session, 'payment_intent'> | null | undefined,
): string | null {
  if (!session || !session.payment_intent) {
    return null;
  }

  const pi = session.payment_intent;
  if (typeof pi === 'string') {
    return pi.trim().length > 0 ? pi : null;
  }

  if (typeof pi === 'object' && 'id' in pi && typeof pi.id === 'string') {
    return pi.id.trim().length > 0 ? pi.id : null;
  }

  return null;
}
