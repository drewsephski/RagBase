import { afterEach, describe, expect, test } from "@jest/globals";
import {
  parseCheckoutReturnParams,
  isSameAppHostname,
  normalizeAppHostname,
  persistCheckoutWorkspaceId,
  readCheckoutWorkspaceId,
  isCheckoutSessionHandled,
  markCheckoutSessionHandled,
} from "@/lib/billing/checkout-return-state";

describe("checkout return params", () => {
  test("parses success return with session id", () => {
    expect(
      parseCheckoutReturnParams({
        checkout: "success",
        session_id: "cs_test_123",
      }),
    ).toEqual({
      status: "success",
      sessionId: "cs_test_123",
    });
  });

  test("parses cancel return", () => {
    expect(parseCheckoutReturnParams({ checkout: "cancel" })).toEqual({
      status: "cancel",
      sessionId: null,
    });
  });

  test("returns idle params when checkout param is absent", () => {
    expect(parseCheckoutReturnParams({})).toEqual({
      status: null,
      sessionId: null,
    });
  });
});

describe("hostname normalization", () => {
  test("treats apex and www as the same app hostname", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.ragbase.dev";

    expect(normalizeAppHostname("www.ragbase.dev")).toBe("ragbase.dev");
    expect(normalizeAppHostname("ragbase.dev")).toBe("ragbase.dev");
    expect(isSameAppHostname("ragbase.dev")).toBe(true);
    expect(isSameAppHostname("www.ragbase.dev")).toBe(true);
    expect(isSameAppHostname("rag-base-preview.vercel.app")).toBe(false);
  });
});

describe("checkout return session storage", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  test("persists and reads checkout workspace id", () => {
    persistCheckoutWorkspaceId("ws_123");
    expect(readCheckoutWorkspaceId()).toBe("ws_123");
  });

  test("tracks handled checkout sessions", () => {
    expect(isCheckoutSessionHandled("cs_test_123")).toBe(false);
    markCheckoutSessionHandled("cs_test_123");
    expect(isCheckoutSessionHandled("cs_test_123")).toBe(true);
  });
});
