import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PRO_ACTIVE_STATUSES } from "@/lib/billing/types";
import { getStripeClient } from "@/lib/stripe/client";

async function loadLinkedSubscriptionIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("stripe_subscription_id")
    .eq("owner_user_id", userId)
    .not("stripe_subscription_id", "is", null);

  if (error) {
    throw new Error(`Failed to load linked subscriptions: ${error.message}`);
  }

  return new Set(
    (data ?? [])
      .map((row) => row.stripe_subscription_id as string | null)
      .filter((value): value is string => Boolean(value)),
  );
}

async function loadKnownCustomerIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("stripe_customer_id")
    .eq("owner_user_id", userId)
    .not("stripe_customer_id", "is", null);

  if (error) {
    throw new Error(`Failed to load Stripe customers: ${error.message}`);
  }

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.stripe_customer_id) {
      ids.add(row.stripe_customer_id as string);
    }
  }

  return [...ids];
}

function isReclaimableSubscription(subscription: Stripe.Subscription): boolean {
  return (PRO_ACTIVE_STATUSES as readonly string[]).includes(subscription.status);
}

async function findOrphanForCustomer(
  stripe: Stripe,
  customerId: string,
  linkedSubscriptionIds: Set<string>,
): Promise<Stripe.Subscription | null> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  for (const subscription of subscriptions.data) {
    if (linkedSubscriptionIds.has(subscription.id)) {
      continue;
    }

    if (isReclaimableSubscription(subscription)) {
      return subscription;
    }
  }

  return null;
}

export async function findStripeCustomerIdForUser(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined,
): Promise<string | null> {
  const knownCustomerIds = await loadKnownCustomerIds(supabase, userId);
  if (knownCustomerIds.length > 0) {
    return knownCustomerIds[0] ?? null;
  }

  if (!email?.trim()) {
    return null;
  }

  const stripe = getStripeClient();
  const customers = await stripe.customers.list({
    email: email.trim(),
    limit: 1,
  });

  return customers.data[0]?.id ?? null;
}

export async function findOrphanSubscriptionForUser(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined,
): Promise<Stripe.Subscription | null> {
  const stripe = getStripeClient();
  const linkedSubscriptionIds = await loadLinkedSubscriptionIds(supabase, userId);
  const customerIds = new Set(await loadKnownCustomerIds(supabase, userId));

  if (email?.trim()) {
    const customers = await stripe.customers.list({
      email: email.trim(),
      limit: 5,
    });

    for (const customer of customers.data) {
      customerIds.add(customer.id);
    }
  }

  for (const customerId of customerIds) {
    const orphan = await findOrphanForCustomer(
      stripe,
      customerId,
      linkedSubscriptionIds,
    );

    if (orphan) {
      return orphan;
    }
  }

  return null;
}
