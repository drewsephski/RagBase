import type { SupabaseClient } from "@supabase/supabase-js";
import { isProActive } from "@/lib/billing/pro-plan";
import { fetchWorkspaceBilling } from "@/lib/billing/subscription-status";
import { mapBillingRow } from "@/lib/billing/types";
import { getStripeClient } from "@/lib/stripe/client";
import { WorkspaceDeleteError } from "@/lib/workspace/delete-errors";

export interface WorkspaceDeleteOptions {
  cancelSubscription?: boolean;
}

function hasBillableSubscription(subscriptionId: string | null): boolean {
  return Boolean(subscriptionId?.trim());
}

export function requiresSubscriptionCancellation(
  subscriptionId: string | null,
  subscriptionStatus: string | null,
): boolean {
  if (!hasBillableSubscription(subscriptionId)) {
    return false;
  }

  if (!subscriptionStatus) {
    return true;
  }

  const terminalStatuses = new Set([
    "canceled",
    "incomplete_expired",
    "unpaid",
  ]);

  return !terminalStatuses.has(subscriptionStatus);
}

export async function cancelWorkspaceStripeSubscription(
  subscriptionId: string,
): Promise<void> {
  const stripe = getStripeClient();
  await stripe.subscriptions.cancel(subscriptionId);
}

export async function assertWorkspaceDeletable(
  supabase: SupabaseClient,
  workspaceId: string,
  options: WorkspaceDeleteOptions = {},
): Promise<void> {
  const billingRow = await fetchWorkspaceBilling(supabase, workspaceId);
  if (!billingRow) {
    throw new WorkspaceDeleteError("Workspace not found.", 404, "not_found");
  }

  const billing = mapBillingRow(billingRow);
  const proActive = isProActive(billing);
  const needsCancellation = requiresSubscriptionCancellation(
    billing.stripeSubscriptionId,
    billing.stripeSubscriptionStatus,
  );

  if (!needsCancellation) {
    return;
  }

  if (proActive && !options.cancelSubscription) {
    throw new WorkspaceDeleteError(
      "This workspace has an active Pro subscription. Confirm cancellation to delete it, or manage billing first.",
      409,
      "active_subscription",
    );
  }

  if (!options.cancelSubscription) {
    throw new WorkspaceDeleteError(
      "This workspace still has a Stripe subscription on file. Confirm cancellation to delete it.",
      409,
      "active_subscription",
    );
  }
}

export async function prepareWorkspaceDeletion(
  supabase: SupabaseClient,
  workspaceId: string,
  options: WorkspaceDeleteOptions = {},
): Promise<void> {
  await assertWorkspaceDeletable(supabase, workspaceId, options);

  const billingRow = await fetchWorkspaceBilling(supabase, workspaceId);
  if (!billingRow?.stripe_subscription_id) {
    return;
  }

  const billing = mapBillingRow(billingRow);
  if (!requiresSubscriptionCancellation(
    billing.stripeSubscriptionId,
    billing.stripeSubscriptionStatus,
  )) {
    return;
  }

  if (!options.cancelSubscription) {
    return;
  }

  await cancelWorkspaceStripeSubscription(billingRow.stripe_subscription_id);
}
