import { describe, expect, test } from "@jest/globals";
import { getCheckoutAuthState } from "@/lib/billing/checkout-auth-state";

describe("getCheckoutAuthState", () => {
  test("allows checkout when Supabase auth is not configured", () => {
    expect(getCheckoutAuthState({ isAuthConfigured: false })).toEqual({
      status: "ready",
      canCheckout: true,
      statusMessage: null,
    });
  });

  test("blocks checkout while auth is loading", () => {
    expect(
      getCheckoutAuthState({
        isAuthConfigured: true,
        isLoading: true,
        hasUser: false,
      }),
    ).toEqual({
      status: "checking",
      canCheckout: false,
      statusMessage: "Checking account…",
    });
  });

  test("treats missing isLoading as checking when auth is configured", () => {
    expect(
      getCheckoutAuthState({
        isAuthConfigured: true,
        hasUser: false,
      }),
    ).toEqual({
      status: "checking",
      canCheckout: false,
      statusMessage: "Checking account…",
    });
  });

  test("requires sign-in when auth resolved without a user", () => {
    expect(
      getCheckoutAuthState({
        isAuthConfigured: true,
        isLoading: false,
        hasUser: false,
      }),
    ).toEqual({
      status: "sign_in_required",
      canCheckout: false,
      statusMessage:
        "Sign in to subscribe — your Pro plan stays linked to your account.",
    });
  });

  test("allows checkout for signed-in users", () => {
    expect(
      getCheckoutAuthState({
        isAuthConfigured: true,
        isLoading: false,
        hasUser: true,
      }),
    ).toEqual({
      status: "ready",
      canCheckout: true,
      statusMessage: null,
    });
  });
});
