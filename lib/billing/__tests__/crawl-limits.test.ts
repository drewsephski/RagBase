import { describe, expect, test } from "@jest/globals";
import { buildCrawlQuotaSummary, getCrawlLimitsConfig } from "@/lib/billing/crawl-limits";
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
    crawlCountPeriod: 1,
    crawledPagesPeriod: 12,
    crawlPeriodStart: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getCrawlLimitsConfig", () => {
  test("returns default limits", () => {
    expect(getCrawlLimitsConfig()).toEqual({
      maxDepth: 2,
      maxPages: 25,
      maxActivePerWorkspace: 1,
      maxCrawlsPerPeriod: 3,
      maxPagesPerPeriod: 75,
    });
  });
});

describe("buildCrawlQuotaSummary", () => {
  test("maps workspace counters to quota summary", () => {
    const limits = getCrawlLimitsConfig();
    expect(buildCrawlQuotaSummary(createBilling(), limits)).toEqual({
      crawlsUsed: 1,
      crawlsLimit: 3,
      pagesUsed: 12,
      pagesLimit: 75,
    });
  });
});
