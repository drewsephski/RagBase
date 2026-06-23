import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isBillingEnabled } from "@/lib/billing/flags";
import { getStripeProPriceId, isConfiguredProPrice } from "@/lib/billing/stripe-catalog";
import { activateWorkspacePro } from "@/lib/billing/subscription-sync";
import { getStripeClient } from "@/lib/stripe/client";
import { getAppUrl } from "@/lib/site";

export class CheckoutSessionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CheckoutSessionError";
    this.status = status;
  }
}

export function getCheckoutReturnUrls(): {
  successUrl: string;
  cancelUrl: string;
} {
  const appUrl = getAppUrl();
  return {
    successUrl: `${appUrl}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appUrl}/app?checkout=cancel`,
  };
}

export function isServerCheckoutConfigured(): boolean {
  if (!isBillingEnabled()) {
    return false;
  }

  try {
    getStripeProPriceId();
    return true;
  } catch {
    return false;
  }
}

export async function createProCheckoutSession(
  workspaceId: string,
  options: {
    customerEmail?: string | null;
    stripeCustomerId?: string | null;
  } = {},
): Promise<Stripe.Checkout.Session> {
  if (!isServerCheckoutConfigured()) {
    throw new CheckoutSessionError("Checkout is not configured.", 503);
  }

  const stripe = getStripeClient();
  const { successUrl, cancelUrl } = getCheckoutReturnUrls();
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: getStripeProPriceId(), quantity: 1 }],
    client_reference_id: workspaceId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  };

  if (options.stripeCustomerId) {
    sessionParams.customer = options.stripeCustomerId;
  } else if (options.customerEmail) {
    sessionParams.customer_email = options.customerEmail;
  }

  return await stripe.checkout.sessions.create(sessionParams);
}

function getCheckoutCustomerId(session: Stripe.Checkout.Session): string | null {
  const customer = session.customer;
  if (typeof customer === "string") {
    return customer;
  }
  return customer?.id ?? null;
}

function getCheckoutSubscriptionId(session: Stripe.Checkout.Session): string | null {
  const subscription = session.subscription;
  if (typeof subscription === "string") {
    return subscription;
  }
  return subscription?.id ?? null;
}

export function isCheckoutSessionComplete(session: Stripe.Checkout.Session): boolean {
  if (session.status !== "complete") {
    return false;
  }

  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

async function retrieveSubscriptionForCheckout(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  if (typeof session.subscription === "object" && session.subscription) {
    return session.subscription;
  }

  return await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
}

export async function completeProCheckout(
  supabase: SupabaseClient,
  stripe: Stripe,
  workspaceId: string,
  customerId: string,
  subscriptionId: string,
): Promise<void> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  const subscriptionPriceId = subscription.items.data[0]?.price?.id ?? null;
  if (!isConfiguredProPrice(subscriptionPriceId)) {
    throw new CheckoutSessionError("Unexpected subscription price.", 400);
  }

  await activateWorkspacePro(supabase, workspaceId, customerId, subscription);
}

export async function syncLatestCompletedCheckoutForWorkspace(
  supabase: SupabaseClient,
  stripe: Stripe,
  workspaceId: string,
): Promise<{ activated: boolean }> {
  const createdAfter = Math.floor(Date.now() / 1000) - 60 * 60;
  const sessions = await stripe.checkout.sessions.list({
    limit: 100,
    created: { gte: createdAfter },
  });

  const match = sessions.data
    .filter(
      (session) =>
        session.client_reference_id === workspaceId && session.status === "complete",
    )
    .sort((left, right) => right.created - left.created)[0];

  if (!match?.id) {
    return { activated: false };
  }

  return syncWorkspaceFromCheckoutSession(supabase, stripe, match.id, workspaceId);
}

export async function syncWorkspaceFromCheckoutSession(
  supabase: SupabaseClient,
  stripe: Stripe,
  sessionId: string,
  expectedWorkspaceId: string,
): Promise<{ activated: boolean }> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  const workspaceId = session.client_reference_id?.trim();
  if (!workspaceId || workspaceId !== expectedWorkspaceId) {
    throw new CheckoutSessionError("Checkout session does not match this workspace.", 403);
  }

  if (!isCheckoutSessionComplete(session)) {
    return { activated: false };
  }

  const customerId = getCheckoutCustomerId(session);
  const subscriptionId = getCheckoutSubscriptionId(session);

  if (!customerId || !subscriptionId) {
    return { activated: false };
  }

  const subscription = await retrieveSubscriptionForCheckout(stripe, session, subscriptionId);
  const subscriptionPriceId = subscription.items.data[0]?.price?.id ?? null;

  if (!isConfiguredProPrice(subscriptionPriceId)) {
    throw new CheckoutSessionError("Unexpected subscription price.", 400);
  }

  await activateWorkspacePro(supabase, workspaceId, customerId, subscription);
  return { activated: true };
}
