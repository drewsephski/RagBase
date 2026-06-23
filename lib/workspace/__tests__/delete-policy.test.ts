import { describe, expect, test } from "@jest/globals";
import {
  requiresSubscriptionCancellation,
} from "@/lib/workspace/delete-policy";

describe("requiresSubscriptionCancellation", () => {
  test("returns false when no subscription id", () => {
    expect(requiresSubscriptionCancellation(null, "active")).toBe(false);
  });

  test("returns true for active subscriptions", () => {
    expect(requiresSubscriptionCancellation("sub_123", "active")).toBe(true);
  });

  test("returns false for canceled subscriptions", () => {
    expect(requiresSubscriptionCancellation("sub_123", "canceled")).toBe(false);
  });

  test("returns true when status is missing but subscription id exists", () => {
    expect(requiresSubscriptionCancellation("sub_123", null)).toBe(true);
  });
});

describe("isWorkspaceRetentionExempt subscription guard", () => {
  test("exempts workspaces with non-terminal stripe subscriptions", async () => {
    const { isWorkspaceRetentionExempt } = await import("@/lib/workspace/retention");

    expect(
      isWorkspaceRetentionExempt(
        {
          id: "ws_1",
          plan: "pro",
          stripe_customer_id: "cus_1",
          stripe_subscription_id: "sub_1",
          stripe_subscription_status: "past_due",
          stripe_current_period_start: null,
          stripe_current_period_end: null,
          pro_activated_at: null,
          stripe_past_due_at: "2020-01-01T00:00:00.000Z",
          recovery_acknowledged_at: null,
          crawl_count_period: 0,
          crawled_pages_period: 0,
          crawl_period_start: null,
        },
        false,
      ),
    ).toBe(true);
  });
});
