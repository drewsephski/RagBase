import { describe, expect, test } from "@jest/globals";
import { isWorkspaceRetentionExempt } from "@/lib/workspace/retention";
import type { WorkspaceBillingRow } from "@/lib/billing/types";

function makeRow(overrides: Partial<WorkspaceBillingRow> = {}): WorkspaceBillingRow {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    plan: "anonymous",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_subscription_status: null,
    stripe_current_period_start: null,
    stripe_current_period_end: null,
    pro_activated_at: null,
    stripe_past_due_at: null,
    recovery_acknowledged_at: null,
    crawl_count_period: 0,
    crawled_pages_period: 0,
    crawl_period_start: null,
    ...overrides,
  };
}

describe("isWorkspaceRetentionExempt", () => {
  test("exempts workspaces with acknowledged recovery link", () => {
    const row = makeRow({
      recovery_acknowledged_at: "2026-06-01T00:00:00.000Z",
    });

    expect(isWorkspaceRetentionExempt(row, false)).toBe(true);
  });

  test("exempts workspaces with active recovery token", () => {
    expect(isWorkspaceRetentionExempt(makeRow(), true)).toBe(true);
  });

  test("exempts active Pro workspaces", () => {
    const row = makeRow({
      plan: "pro",
      stripe_subscription_status: "active",
      stripe_current_period_end: "2099-01-01T00:00:00.000Z",
    });

    expect(isWorkspaceRetentionExempt(row, false)).toBe(true);
  });

  test("does not exempt inactive anonymous workspaces", () => {
    expect(isWorkspaceRetentionExempt(makeRow(), false)).toBe(false);
  });
});
