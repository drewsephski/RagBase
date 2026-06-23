import type Stripe from "stripe";

export function getSubscriptionPeriodBounds(subscription: Stripe.Subscription): {
  periodStart: number | null;
  periodEnd: number | null;
} {
  const items = subscription.items?.data ?? [];
  if (items.length === 0) {
    return { periodStart: null, periodEnd: null };
  }

  let periodStart = items[0]!.current_period_start;
  let periodEnd = items[0]!.current_period_end;

  for (const item of items) {
    if (item.current_period_start < periodStart) {
      periodStart = item.current_period_start;
    }
    if (item.current_period_end > periodEnd) {
      periodEnd = item.current_period_end;
    }
  }

  return { periodStart, periodEnd };
}

export function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription;
  if (!subscription) {
    return null;
  }

  return typeof subscription === "string" ? subscription : subscription.id;
}
