import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/env/server";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey());
  }
  return stripeClient;
}

/** @internal Test helper */
export function resetStripeClientForTests(): void {
  stripeClient = null;
}
