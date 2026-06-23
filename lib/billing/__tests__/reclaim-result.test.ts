import { describe, expect, test } from "@jest/globals";
import { getReclaimErrorMessage } from "@/lib/billing/reclaim-result";

describe("getReclaimErrorMessage", () => {
  test("maps subscription conflict to user-facing guidance", () => {
    expect(
      getReclaimErrorMessage(
        "subscription_linked_elsewhere",
        "Your RagBase Pro subscription is linked to another workspace.",
      ),
    ).toContain("linked to another workspace");
  });

  test("maps missing Stripe customer to attach failure guidance", () => {
    expect(
      getReclaimErrorMessage(
        "stripe_customer_missing",
        "Could not resolve Stripe customer for subscription.",
      ),
    ).toContain("could not connect it");
  });
});
