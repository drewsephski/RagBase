/**
 * Stripe catalog IDs for RagBase Pro (set via scripts/stripe-setup.mjs).
 */

function readStripeProPriceId(): string | null {
  const value = process.env.STRIPE_PRO_PRICE_ID?.trim();
  return value && value.length > 0 ? value : null;
}

export function getStripeProPriceId(): string {
  const priceId = readStripeProPriceId();
  if (!priceId) {
    throw new Error("STRIPE_PRO_PRICE_ID is not configured");
  }
  return priceId;
}

export function isConfiguredProPrice(priceId: string | null | undefined): boolean {
  const expected = readStripeProPriceId();
  if (!expected || !priceId) {
    return true;
  }
  return priceId === expected;
}
