import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { downgradeWorkspace } from "@/lib/billing/downgrade-workspace";
import { getSubscriptionPeriodBounds } from "@/lib/billing/stripe-subscription";
import { PRO_ACTIVE_STATUSES } from "@/lib/billing/types";

function unixToIso(unix: number | null | undefined): string | null {
  if (unix == null) {
    return null;
  }
  return new Date(unix * 1000).toISOString();
}

function getPeriodIso(subscription: Stripe.Subscription): {
  periodStart: string | null;
  periodEnd: string | null;
} {
  const { periodStart, periodEnd } = getSubscriptionPeriodBounds(subscription);
  return {
    periodStart: unixToIso(periodStart),
    periodEnd: unixToIso(periodEnd),
  };
}

function shouldResetCrawlPeriod(
  existingPeriodStart: string | null,
  nextPeriodStart: string | null,
): boolean {
  if (!nextPeriodStart) {
    return false;
  }
  if (!existingPeriodStart) {
    return true;
  }
  return existingPeriodStart !== nextPeriodStart;
}

function applyCrawlPeriodReset(
  update: Record<string, unknown>,
  resetCrawl: boolean,
  periodStart: string | null,
): void {
  if (!resetCrawl) {
    return;
  }

  update.crawl_count_period = 0;
  update.crawled_pages_period = 0;
  update.crawl_period_start = periodStart;
}

function buildActiveSubscriptionUpdate(
  status: string,
  periodStart: string | null,
  periodEnd: string | null,
  resetCrawl: boolean,
  pastDueAt: string | null,
): Record<string, unknown> {
  const update: Record<string, unknown> = {
    plan: "pro",
    stripe_subscription_status: status,
    stripe_current_period_start: periodStart,
    stripe_current_period_end: periodEnd,
    stripe_past_due_at: pastDueAt,
  };

  applyCrawlPeriodReset(update, resetCrawl, periodStart);
  return update;
}

interface WorkspaceSubscriptionRow {
  id: string;
  crawl_period_start: string | null;
  stripe_past_due_at: string | null;
}

export async function activateWorkspacePro(
  supabase: SupabaseClient,
  workspaceId: string,
  customerId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const { periodStart, periodEnd } = getPeriodIso(subscription);
  const now = new Date().toISOString();

  const { data: existing, error: fetchError } = await supabase
    .from("workspaces")
    .select("id, crawl_period_start, stripe_past_due_at")
    .eq("id", workspaceId)
    .maybeSingle();

  if (fetchError || !existing) {
    throw new Error(`Workspace not found for Pro activation: ${workspaceId}`);
  }

  const row = existing as WorkspaceSubscriptionRow;
  const resetCrawl = shouldResetCrawlPeriod(row.crawl_period_start, periodStart);

  const update: Record<string, unknown> = {
    plan: "pro",
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_current_period_start: periodStart,
    stripe_current_period_end: periodEnd,
    pro_activated_at: now,
    stripe_past_due_at: null,
    crawl_period_start: periodStart,
  };

  if (resetCrawl) {
    update.crawl_count_period = 0;
    update.crawled_pages_period = 0;
  }

  const { error } = await supabase.from("workspaces").update(update).eq("id", workspaceId);

  if (error) {
    throw new Error(`Failed to activate Pro workspace: ${error.message}`);
  }
}

export async function syncWorkspaceFromSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<void> {
  const { data: workspace, error: fetchError } = await supabase
    .from("workspaces")
    .select("id, crawl_period_start, stripe_past_due_at")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to load workspace for subscription sync: ${fetchError.message}`);
  }

  if (!workspace) {
    console.warn("No workspace found for subscription", subscription.id);
    return;
  }

  const row = workspace as WorkspaceSubscriptionRow;
  const status = subscription.status;
  const { periodStart, periodEnd } = getPeriodIso(subscription);
  const resetCrawl = shouldResetCrawlPeriod(row.crawl_period_start, periodStart);

  if (!(PRO_ACTIVE_STATUSES as readonly string[]).includes(status)) {
    if (status === "past_due") {
      const pastDueAt = row.stripe_past_due_at ?? new Date().toISOString();
      const update = buildActiveSubscriptionUpdate(
        status,
        periodStart,
        periodEnd,
        resetCrawl,
        pastDueAt,
      );

      const { error } = await supabase
        .from("workspaces")
        .update(update)
        .eq("id", row.id);

      if (error) {
        throw new Error(`Failed to sync past_due workspace: ${error.message}`);
      }
      return;
    }

    await downgradeWorkspace(supabase, row.id);
    return;
  }

  const update = buildActiveSubscriptionUpdate(
    status,
    periodStart,
    periodEnd,
    resetCrawl,
    null,
  );

  const { error } = await supabase.from("workspaces").update(update).eq("id", row.id);

  if (error) {
    throw new Error(`Failed to sync active workspace: ${error.message}`);
  }
}

export async function markWorkspacePastDue(
  supabase: SupabaseClient,
  subscriptionId: string,
): Promise<void> {
  const { data: workspace, error: fetchError } = await supabase
    .from("workspaces")
    .select("id, stripe_past_due_at")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to load workspace for past_due: ${fetchError.message}`);
  }

  if (!workspace) {
    console.warn("No workspace found for past_due invoice", subscriptionId);
    return;
  }

  const row = workspace as { id: string; stripe_past_due_at: string | null };
  const pastDueAt = row.stripe_past_due_at ?? new Date().toISOString();

  const { error } = await supabase
    .from("workspaces")
    .update({
      plan: "pro",
      stripe_subscription_status: "past_due",
      stripe_past_due_at: pastDueAt,
    })
    .eq("id", row.id);

  if (error) {
    throw new Error(`Failed to mark workspace past_due: ${error.message}`);
  }
}
