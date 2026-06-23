import { NextRequest } from "next/server";
import Stripe from "stripe";
import { isWebhooksEnabled } from "@/lib/billing/flags";
import { dispatchStripeWebhookEvent } from "@/lib/billing/webhook-handlers";
import {
  claimStripeWebhookEvent,
  markStripeWebhookEventProcessed,
} from "@/lib/billing/webhook-idempotency";
import { getStripeWebhookSecret } from "@/lib/env/server";
import { getStripeClient } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  if (!isWebhooksEnabled()) {
    return Response.json({ error: "Stripe webhooks are disabled" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  let claimResult: Awaited<ReturnType<typeof claimStripeWebhookEvent>>;
  try {
    claimResult = await claimStripeWebhookEvent(supabase, event);
  } catch (error) {
    console.error("Failed to claim Stripe webhook event:", error);
    return Response.json({ error: "Failed to record webhook event" }, { status: 500 });
  }

  if (claimResult === "already_processed") {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    const stripe = getStripeClient();
    await dispatchStripeWebhookEvent(supabase, stripe, event);
    await markStripeWebhookEventProcessed(supabase, event.id);
  } catch (error) {
    console.error("Stripe webhook handler failed:", event.type, error);
    return Response.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
