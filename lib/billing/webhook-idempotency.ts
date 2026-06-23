import type { SupabaseClient } from "@supabase/supabase-js";

export type StripeWebhookClaimResult =
  | "claimed"
  | "already_processed"
  | "retry";

interface StripeWebhookEventRow {
  processed_at: string | null;
}

export async function claimStripeWebhookEvent(
  supabase: SupabaseClient,
  event: { id: string; type: string },
): Promise<StripeWebhookClaimResult> {
  const { error: insertError } = await supabase.from("stripe_webhook_events").insert({
    id: event.id,
    type: event.type,
    processed_at: null,
  });

  if (!insertError) {
    return "claimed";
  }

  if (insertError.code !== "23505") {
    throw new Error(`Failed to record Stripe webhook event: ${insertError.message}`);
  }

  const { data, error: selectError } = await supabase
    .from("stripe_webhook_events")
    .select("processed_at")
    .eq("id", event.id)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to look up Stripe webhook event: ${selectError.message}`);
  }

  const row = data as StripeWebhookEventRow | null;
  if (!row) {
    throw new Error("Stripe webhook event duplicate without row");
  }

  if (row.processed_at) {
    return "already_processed";
  }

  return "retry";
}

export async function markStripeWebhookEventProcessed(
  supabase: SupabaseClient,
  eventId: string,
): Promise<void> {
  const processedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .update({ processed_at: processedAt })
    .eq("id", eventId)
    .is("processed_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to mark Stripe webhook event processed: ${error.message}`);
  }

  if (!data) {
    const { data: existing, error: existingError } = await supabase
      .from("stripe_webhook_events")
      .select("processed_at")
      .eq("id", eventId)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Failed to verify Stripe webhook event processed state: ${existingError.message}`,
      );
    }

    const existingRow = existing as StripeWebhookEventRow | null;
    if (!existingRow?.processed_at) {
      throw new Error("Failed to mark Stripe webhook event processed");
    }
  }
}
