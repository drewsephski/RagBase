import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { completeProCheckout } from "@/lib/billing/checkout-session";
import { downgradeWorkspace } from "@/lib/billing/downgrade-workspace";
import {
  markWorkspacePastDue,
  syncWorkspaceFromSubscription,
} from "@/lib/billing/subscription-sync";
import { getInvoiceSubscriptionId } from "@/lib/billing/stripe-subscription";

async function handleCheckoutSessionCompleted(
  supabase: SupabaseClient,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const workspaceId = session.client_reference_id?.trim();
  if (!workspaceId) {
    console.error("checkout.session.completed missing client_reference_id");
    return;
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!customerId || !subscriptionId) {
    console.error("checkout.session.completed missing customer or subscription", {
      workspaceId,
    });
    return;
  }

  try {
    await completeProCheckout(supabase, stripe, workspaceId, customerId, subscriptionId);
  } catch (error) {
    console.error("checkout.session.completed activation failed", {
      workspaceId,
      error,
    });
    throw error;
  }
}

async function handleSubscriptionUpdated(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<void> {
  await syncWorkspaceFromSubscription(supabase, subscription);
}

async function handleSubscriptionDeleted(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<void> {
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load workspace for subscription delete: ${error.message}`);
  }

  if (!workspace) {
    console.warn("No workspace found for deleted subscription", subscription.id);
    return;
  }

  await downgradeWorkspace(supabase, workspace.id as string);
}

async function handleInvoicePaymentFailed(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    return;
  }

  await markWorkspacePastDue(supabase, subscriptionId);
}

export async function dispatchStripeWebhookEvent(
  supabase: SupabaseClient,
  stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        supabase,
        stripe,
        event.data.object as Stripe.Checkout.Session,
      );
      return;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(
        supabase,
        event.data.object as Stripe.Subscription,
      );
      return;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(
        supabase,
        event.data.object as Stripe.Subscription,
      );
      return;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(
        supabase,
        event.data.object as Stripe.Invoice,
      );
      return;
    default:
      return;
  }
}
