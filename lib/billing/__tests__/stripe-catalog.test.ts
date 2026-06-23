import { describe, expect, test } from "@jest/globals";
import { isConfiguredProPrice } from "@/lib/billing/stripe-catalog";

describe("isConfiguredProPrice", () => {
  test("allows any price when STRIPE_PRO_PRICE_ID is unset", () => {
    delete process.env.STRIPE_PRO_PRICE_ID;
    expect(isConfiguredProPrice("price_any")).toBe(true);
  });

  test("matches configured price id", () => {
    process.env.STRIPE_PRO_PRICE_ID = "price_pro_123";
    expect(isConfiguredProPrice("price_pro_123")).toBe(true);
    expect(isConfiguredProPrice("price_other")).toBe(false);
  });
});
