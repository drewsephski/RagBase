import type { SupabaseClient } from "@supabase/supabase-js";
import { isProActive } from "@/lib/billing/pro-plan";
import { mapBillingRow, type WorkspaceBillingRow } from "@/lib/billing/types";

const RETENTION_EXEMPT_COLUMNS =
  "id, plan, stripe_subscription_status, stripe_current_period_end, stripe_past_due_at, recovery_acknowledged_at";

export function isWorkspaceRetentionExempt(
  row: WorkspaceBillingRow,
  hasActiveRecoveryToken: boolean,
): boolean {
  if (row.recovery_acknowledged_at) {
    return true;
  }

  if (hasActiveRecoveryToken) {
    return true;
  }

  const billing = mapBillingRow(row);
  if (isProActive(billing)) {
    return true;
  }

  if (!row.stripe_subscription_id) {
    return false;
  }

  const terminalStatuses = new Set([
    "canceled",
    "incomplete_expired",
    "unpaid",
  ]);

  return !terminalStatuses.has(row.stripe_subscription_status ?? "");
}

export async function loadActiveRecoveryWorkspaceIds(
  supabase: SupabaseClient,
  workspaceIds: string[],
): Promise<Set<string>> {
  if (workspaceIds.length === 0) {
    return new Set();
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("workspace_recovery_tokens")
    .select("workspace_id")
    .in("workspace_id", workspaceIds)
    .is("revoked_at", null)
    .gt("expires_at", nowIso);

  if (error) {
    throw new Error(`Failed to load recovery tokens: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.workspace_id as string));
}

export async function fetchInactiveWorkspaceRows(
  supabase: SupabaseClient,
  cutoffIso: string,
): Promise<WorkspaceBillingRow[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select(RETENTION_EXEMPT_COLUMNS)
    .lt("last_seen_at", cutoffIso);

  if (error) {
    throw new Error(`Failed to query inactive workspaces: ${error.message}`);
  }

  return (data ?? []) as WorkspaceBillingRow[];
}
