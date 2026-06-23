import { describe, expect, test, jest } from "@jest/globals";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  claimStripeWebhookEvent,
  markStripeWebhookEventProcessed,
} from "@/lib/billing/webhook-idempotency";

function createClaimSupabaseMock(options: {
  insertError?: { code?: string; message: string } | null;
  processedAt?: string | null;
  selectError?: { message: string } | null;
}): SupabaseClient {
  const maybeSingle = jest.fn(async () => ({
    data:
      options.processedAt === undefined
        ? null
        : { processed_at: options.processedAt },
    error: options.selectError ?? null,
  }));

  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const insert = jest.fn(async () => ({ error: options.insertError ?? null }));
  const from = jest.fn(() => ({ insert, select }));

  return { from } as unknown as SupabaseClient;
}

describe("claimStripeWebhookEvent", () => {
  test("returns claimed on first insert", async () => {
    const supabase = createClaimSupabaseMock({ insertError: null });

    await expect(
      claimStripeWebhookEvent(supabase, { id: "evt_1", type: "checkout.session.completed" }),
    ).resolves.toBe("claimed");
  });

  test("returns already_processed when duplicate row has processed_at", async () => {
    const supabase = createClaimSupabaseMock({
      insertError: { code: "23505", message: "duplicate" },
      processedAt: "2026-06-23T00:00:00.000Z",
    });

    await expect(
      claimStripeWebhookEvent(supabase, { id: "evt_1", type: "checkout.session.completed" }),
    ).resolves.toBe("already_processed");
  });

  test("returns retry when duplicate row has null processed_at", async () => {
    const supabase = createClaimSupabaseMock({
      insertError: { code: "23505", message: "duplicate" },
      processedAt: null,
    });

    await expect(
      claimStripeWebhookEvent(supabase, { id: "evt_1", type: "checkout.session.completed" }),
    ).resolves.toBe("retry");
  });

  test("throws on non-duplicate insert errors", async () => {
    const supabase = createClaimSupabaseMock({
      insertError: { code: "42501", message: "permission denied" },
    });

    await expect(
      claimStripeWebhookEvent(supabase, { id: "evt_1", type: "checkout.session.completed" }),
    ).rejects.toThrow("Failed to record Stripe webhook event");
  });
});

describe("markStripeWebhookEventProcessed", () => {
  test("updates processed_at when row is unprocessed", async () => {
    const update = jest.fn(() => ({
      eq: () => ({
        is: () => ({
          select: () => ({
            maybeSingle: async () => ({ data: { id: "evt_1" }, error: null }),
          }),
        }),
      }),
    }));

    const supabase = {
      from: jest.fn(() => ({ update })),
    } as unknown as SupabaseClient;

    await expect(markStripeWebhookEventProcessed(supabase, "evt_1")).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ processed_at: expect.any(String) }),
    );
  });
});
