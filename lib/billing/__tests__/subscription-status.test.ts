import { describe, expect, test } from "@jest/globals";
import { buildSubscriptionStatusResponse } from "@/lib/billing/subscription-status";
import type { WorkspaceBillingRow } from "@/lib/billing/types";

function createRow(overrides: Partial<WorkspaceBillingRow> = {}): WorkspaceBillingRow {
  return {
    id: "ws-1",
    plan: "pro",
    stripe_customer_id: "cus_123",
    stripe_subscription_id: "sub_123",
    stripe_subscription_status: "active",
    stripe_current_period_start: "2026-06-01T00:00:00.000Z",
    stripe_current_period_end: "2026-07-01T00:00:00.000Z",
    pro_activated_at: "2026-06-01T00:00:00.000Z",
    stripe_past_due_at: null,
    recovery_acknowledged_at: null,
    crawl_count_period: 0,
    crawled_pages_period: 0,
    crawl_period_start: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildSubscriptionStatusResponse", () => {
  test("maps active pro workspace", () => {
    const response = buildSubscriptionStatusResponse(createRow());

    expect(response.plan).toBe("pro");
    expect(response.isProActive).toBe(true);
    expect(response.hasStripeCustomer).toBe(true);
    expect(response.recoveryLinkConfirmed).toBe(false);
    expect(response.currentPeriodEnd).toBe("2026-07-01T00:00:00.000Z");
    expect(response.crawlQuota).toEqual({
      crawlsUsed: 0,
      crawlsLimit: 3,
      pagesUsed: 0,
      pagesLimit: 75,
    });
  });

  test("marks recovery as confirmed when acknowledged", () => {
    const response = buildSubscriptionStatusResponse(
      createRow({ recovery_acknowledged_at: "2026-06-02T00:00:00.000Z" }),
    );

    expect(response.recoveryLinkConfirmed).toBe(true);
  });

  test("returns inactive pro for expired period", () => {
    const response = buildSubscriptionStatusResponse(
      createRow({ stripe_current_period_end: "2026-01-01T00:00:00.000Z" }),
    );

    expect(response.isProActive).toBe(false);
  });
});
