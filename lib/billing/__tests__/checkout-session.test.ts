import { describe, expect, test } from "@jest/globals";
import {
  getCheckoutReturnUrls,
  isCheckoutSessionComplete,
} from "@/lib/billing/checkout-session";

describe("checkout session helpers", () => {
  test("builds success url with session id placeholder", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.ragbase.dev";

    expect(getCheckoutReturnUrls()).toEqual({
      successUrl:
        "https://www.ragbase.dev/app?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "https://www.ragbase.dev/app?checkout=cancel",
    });
  });

  test("detects completed checkout sessions", () => {
    expect(
      isCheckoutSessionComplete({
        status: "complete",
        payment_status: "paid",
      } as never),
    ).toBe(true);

    expect(
      isCheckoutSessionComplete({
        status: "open",
        payment_status: "unpaid",
      } as never),
    ).toBe(false);
  });
});
