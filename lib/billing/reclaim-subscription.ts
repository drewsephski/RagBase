import type { SupabaseClient } from "@supabase/supabase-js";
import { activateWorkspacePro } from "@/lib/billing/subscription-sync";
import { fetchWorkspaceBilling } from "@/lib/billing/subscription-status";
import { mapBillingRow } from "@/lib/billing/types";
import { isProActive } from "@/lib/billing/pro-plan";
import {
  findOrphanSubscriptionForUser,
  findStripeCustomerIdForUser,
} from "@/lib/billing/orphan-subscription";

export class SubscriptionReclaimError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "reclaim_unavailable") {
    super(message);
    this.name = "SubscriptionReclaimError";
    this.status = status;
    this.code = code;
  }
}

export async function reclaimOrphanSubscriptionForWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  email: string | null | undefined,
): Promise<{ reclaimed: boolean }> {
  const billingRow = await fetchWorkspaceBilling(supabase, workspaceId);
  if (!billingRow) {
    throw new SubscriptionReclaimError("Workspace not found.", 404, "not_found");
  }

  const billing = mapBillingRow(billingRow);
  if (isProActive(billing)) {
    return { reclaimed: false };
  }

  const orphan = await findOrphanSubscriptionForUser(supabase, userId, email);
  if (!orphan) {
    return { reclaimed: false };
  }

  const customerId =
    typeof orphan.customer === "string"
      ? orphan.customer
      : orphan.customer?.id;

  if (!customerId) {
    throw new SubscriptionReclaimError(
      "Could not resolve Stripe customer for subscription.",
      502,
      "stripe_customer_missing",
    );
  }

  await activateWorkspacePro(supabase, workspaceId, customerId, orphan);
  return { reclaimed: true };
}

export async function resolveCheckoutStripeCustomerId(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined,
): Promise<string | null> {
  return findStripeCustomerIdForUser(supabase, userId, email);
}
