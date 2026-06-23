import { describe, expect, test } from "@jest/globals";
import { ProRequiredError } from "@/lib/billing/errors";
import { isProActive, requireProPlan } from "@/lib/billing/pro-plan";
import type { BillingWorkspace } from "@/lib/billing/types";

function createBilling(overrides: Partial<BillingWorkspace> = {}): BillingWorkspace {
  return {
    id: "ws-1",
    plan: "pro",
    stripeCustomerId: "cus_123",
    stripeSubscriptionId: "sub_123",
    stripeSubscriptionStatus: "active",
    stripeCurrentPeriodStart: "2026-06-01T00:00:00.000Z",
    stripeCurrentPeriodEnd: "2026-07-01T00:00:00.000Z",
    proActivatedAt: "2026-06-01T00:00:00.000Z",
    stripePastDueAt: null,
    recoveryAcknowledgedAt: null,
    crawlCountPeriod: 0,
    crawledPagesPeriod: 0,
    crawlPeriodStart: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("isProActive", () => {
  test("returns true for active pro within billing period", () => {
    const workspace = createBilling();
    expect(isProActive(workspace, new Date("2026-06-15T00:00:00.000Z"))).toBe(true);
  });

  test("returns true for trialing pro", () => {
    const workspace = createBilling({ stripeSubscriptionStatus: "trialing" });
    expect(isProActive(workspace, new Date("2026-06-15T00:00:00.000Z"))).toBe(true);
  });

  test("returns false when billing period ended", () => {
    const workspace = createBilling();
    expect(isProActive(workspace, new Date("2026-07-02T00:00:00.000Z"))).toBe(false);
  });

  test("returns false for anonymous plan", () => {
    const workspace = createBilling({ plan: "anonymous", stripeSubscriptionStatus: null });
    expect(isProActive(workspace)).toBe(false);
  });

  test("returns true for past_due within grace window", () => {
    const workspace = createBilling({
      stripeSubscriptionStatus: "past_due",
      stripePastDueAt: "2026-06-20T00:00:00.000Z",
    });
    expect(isProActive(workspace, new Date("2026-06-22T00:00:00.000Z"))).toBe(true);
  });

  test("returns false for past_due after grace window", () => {
    const workspace = createBilling({
      stripeSubscriptionStatus: "past_due",
      stripePastDueAt: "2026-06-01T00:00:00.000Z",
    });
    expect(isProActive(workspace, new Date("2026-06-10T00:00:00.000Z"))).toBe(false);
  });

  test("returns false for canceled subscription status", () => {
    const workspace = createBilling({ stripeSubscriptionStatus: "canceled" });
    expect(isProActive(workspace)).toBe(false);
  });
});

describe("requireProPlan", () => {
  test("does not throw for active pro", () => {
    expect(() => requireProPlan(createBilling())).not.toThrow();
  });

  test("throws ProRequiredError for free workspace", () => {
    expect(() =>
      requireProPlan(createBilling({ plan: "anonymous", stripeSubscriptionStatus: null })),
    ).toThrow(ProRequiredError);
  });
});
