import { isBillingEnabled } from "@/lib/billing/flags";

/** @deprecated Use POST /api/billing/checkout (Checkout Sessions) instead of Payment Links. */
function getStripePaymentLinkUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL?.trim();
  return url && url.length > 0 ? url : null;
}

/** @deprecated Use POST /api/billing/checkout (Checkout Sessions) instead. */
export function buildCheckoutUrl(workspaceId: string): string | null {
  if (!isBillingEnabled()) {
    return null;
  }

  const paymentLink = getStripePaymentLinkUrl();
  if (!paymentLink) {
    return null;
  }

  const url = new URL(paymentLink);
  url.searchParams.set("client_reference_id", workspaceId);
  return url.toString();
}

export function isCheckoutAvailable(): boolean {
  return isBillingEnabled();
}
