import type { SupabaseClient } from "@supabase/supabase-js";
import { isProActive } from "@/lib/billing/pro-plan";
import {
  mapBillingRow,
  type SubscriptionStatusResponse,
  type WorkspaceBillingRow,
  WORKSPACE_BILLING_COLUMNS,
} from "@/lib/billing/types";

export async function fetchWorkspaceBilling(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceBillingRow | null> {
  const { data, error } = await supabase
    .from("workspaces")
    .select(WORKSPACE_BILLING_COLUMNS)
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load workspace billing: ${error.message}`);
  }

  return (data as WorkspaceBillingRow | null) ?? null;
}

export function buildSubscriptionStatusResponse(
  row: WorkspaceBillingRow,
): SubscriptionStatusResponse {
  const billing = mapBillingRow(row);

  return {
    plan: row.plan,
    isProActive: isProActive(billing),
    stripeSubscriptionStatus: billing.stripeSubscriptionStatus,
    currentPeriodEnd: billing.stripeCurrentPeriodEnd,
    hasStripeCustomer: Boolean(billing.stripeCustomerId),
    recoveryLinkConfirmed: Boolean(billing.recoveryAcknowledgedAt),
  };
}
