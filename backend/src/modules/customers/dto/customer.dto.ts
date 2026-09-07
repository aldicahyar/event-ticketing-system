/**
 * Response shape for GET /customers/me — deliberately narrow: only the fields
 * safe to expose to the owning user, nothing else from Stripe or the user row.
 */
export interface CustomerInfoDto {
  id: string;
  email: string;
  name: string;
  stripeCustomerId: string | null;
}
