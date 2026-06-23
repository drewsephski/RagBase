import { describe, expect, test, afterEach } from "@jest/globals";
import {
  buildCheckoutUrl,
  isCheckoutAvailable,
} from "@/lib/billing/checkout-url";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("checkout url helpers", () => {
  test("returns null when billing is disabled", () => {
    process.env.NEXT_PUBLIC_BILLING_ENABLED = "false";
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL =
      "https://buy.stripe.com/test_abc";

    expect(buildCheckoutUrl("ws-123")).toBeNull();
    expect(isCheckoutAvailable()).toBe(false);
  });

  test("builds payment link with client reference id", () => {
    process.env.NEXT_PUBLIC_BILLING_ENABLED = "true";
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL =
      "https://buy.stripe.com/test_abc";

    expect(buildCheckoutUrl("ws-123")).toBe(
      "https://buy.stripe.com/test_abc?client_reference_id=ws-123",
    );
    expect(isCheckoutAvailable()).toBe(true);
  });
});
