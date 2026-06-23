import { describe, expect, test } from "@jest/globals";
import {
  getInvoiceSubscriptionId,
  getSubscriptionPeriodBounds,
} from "@/lib/billing/stripe-subscription";
import type Stripe from "stripe";

describe("getSubscriptionPeriodBounds", () => {
  test("reads period from subscription items", () => {
    const subscription = {
      items: {
        data: [
          {
            current_period_start: 1_700_000_000,
            current_period_end: 1_702_592_000,
          },
          {
            current_period_start: 1_700_100_000,
            current_period_end: 1_702_692_000,
          },
        ],
      },
    } as Stripe.Subscription;

    expect(getSubscriptionPeriodBounds(subscription)).toEqual({
      periodStart: 1_700_000_000,
      periodEnd: 1_702_692_000,
    });
  });

  test("returns nulls when no items exist", () => {
    const subscription = { items: { data: [] } } as unknown as Stripe.Subscription;
    expect(getSubscriptionPeriodBounds(subscription)).toEqual({
      periodStart: null,
      periodEnd: null,
    });
  });
});

describe("getInvoiceSubscriptionId", () => {
  test("reads subscription id from parent details", () => {
    const invoice = {
      parent: {
        subscription_details: {
          subscription: "sub_123",
        },
      },
    } as Stripe.Invoice;

    expect(getInvoiceSubscriptionId(invoice)).toBe("sub_123");
  });

  test("returns null when subscription details are missing", () => {
    const invoice = { parent: null } as Stripe.Invoice;
    expect(getInvoiceSubscriptionId(invoice)).toBeNull();
  });
});
