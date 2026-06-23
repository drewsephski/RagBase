import { describe, expect, test } from "@jest/globals";
import {
  assertReclaimSubscriptionAvailable,
  SubscriptionReclaimError,
} from "@/lib/billing/reclaim-subscription";

describe("assertReclaimSubscriptionAvailable", () => {
  test("throws when subscription is linked to another workspace", () => {
    expect(() =>
      assertReclaimSubscriptionAvailable({ id: "ws_other" }, "ws_target"),
    ).toThrow(SubscriptionReclaimError);

    try {
      assertReclaimSubscriptionAvailable({ id: "ws_other" }, "ws_target");
    } catch (error) {
      expect(error).toMatchObject({
        code: "subscription_linked_elsewhere",
        status: 409,
      });
    }
  });

  test("allows reclaim when subscription is not linked elsewhere", () => {
    expect(() => assertReclaimSubscriptionAvailable(null, "ws_target")).not.toThrow();
    expect(() =>
      assertReclaimSubscriptionAvailable({ id: "ws_target" }, "ws_target"),
    ).not.toThrow();
  });
});
