import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/client";
import { getAppUrl } from "@/lib/site";

export async function createBillingPortalSession(
  customerId: string,
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripeClient();

  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getAppUrl()}/app`,
  });
}
