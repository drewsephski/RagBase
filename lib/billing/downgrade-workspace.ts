import type { SupabaseClient } from "@supabase/supabase-js";

export async function downgradeWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<void> {
  const { error } = await supabase
    .from("workspaces")
    .update({
      plan: "anonymous",
      stripe_subscription_id: null,
      stripe_subscription_status: null,
      stripe_current_period_start: null,
      stripe_current_period_end: null,
      pro_activated_at: null,
      stripe_past_due_at: null,
    })
    .eq("id", workspaceId);

  if (error) {
    throw new Error(`Failed to downgrade workspace: ${error.message}`);
  }
}
