import { describe, expect, test, afterEach } from "@jest/globals";
import { isBillingEnabled, isWebhooksEnabled } from "@/lib/billing/flags";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("billing flags", () => {
  test("defaults billing and webhooks to disabled", () => {
    delete process.env.NEXT_PUBLIC_BILLING_ENABLED;
    delete process.env.STRIPE_WEBHOOKS_ENABLED;

    expect(isBillingEnabled()).toBe(false);
    expect(isWebhooksEnabled()).toBe(false);
  });

  test("reads true when env vars are true", () => {
    process.env.NEXT_PUBLIC_BILLING_ENABLED = "true";
    process.env.STRIPE_WEBHOOKS_ENABLED = "true";

    expect(isBillingEnabled()).toBe(true);
    expect(isWebhooksEnabled()).toBe(true);
  });
});
