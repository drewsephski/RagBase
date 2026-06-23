import { afterEach, describe, expect, test } from "@jest/globals";
import {
  buildCheckoutReturnLocation,
  getAppUrl,
  getProPriceDisplay,
  getRecoveryUrl,
  isSameAppOrigin,
  replaceBrowserUrl,
} from "@/lib/site";

describe("getAppUrl", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalVercelUrl = process.env.VERCEL_URL;

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }

    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }

    if (originalVercelUrl === undefined) {
      delete process.env.VERCEL_URL;
    } else {
      process.env.VERCEL_URL = originalVercelUrl;
    }
  });

  test("prefers NEXT_PUBLIC_APP_URL and strips trailing slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.ragbase.dev/";
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;

    expect(getAppUrl()).toBe("https://www.ragbase.dev");
  });

  test("falls back to default ragbase.dev domain", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;

    expect(getAppUrl()).toBe("https://www.ragbase.dev");
  });

  test("ignores VERCEL_URL so Stripe return URLs stay on the canonical domain", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "rag-base-preview.vercel.app";

    expect(getAppUrl()).toBe("https://www.ragbase.dev");
  });
});

describe("checkout return helpers", () => {
  test("detects canonical app origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.ragbase.dev";

    expect(isSameAppOrigin("https://www.ragbase.dev")).toBe(true);
    expect(isSameAppOrigin("https://ragbase.dev")).toBe(true);
    expect(isSameAppOrigin("https://rag-base-preview.vercel.app")).toBe(false);
  });

  test("builds checkout return location on canonical domain", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.ragbase.dev";

    expect(
      buildCheckoutReturnLocation(
        "/app",
        "?checkout=success&session_id=cs_test_123",
      ),
    ).toBe("https://www.ragbase.dev/app?checkout=success&session_id=cs_test_123");
  });

  test("replaceBrowserUrl updates the address bar without navigation", () => {
    const replaceState = jest.fn();
    Object.defineProperty(window, "history", {
      configurable: true,
      value: {
        ...window.history,
        replaceState: replaceState,
        state: { idx: 0 },
      },
    });

    replaceBrowserUrl("/app");

    expect(replaceState).toHaveBeenCalledWith({ idx: 0 }, "", "/app");
  });
});

describe("getProPriceDisplay", () => {
  const original = process.env.NEXT_PUBLIC_PRO_PRICE_DISPLAY;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_PRO_PRICE_DISPLAY;
    } else {
      process.env.NEXT_PUBLIC_PRO_PRICE_DISPLAY = original;
    }
  });

  test("returns env override when set", () => {
    process.env.NEXT_PUBLIC_PRO_PRICE_DISPLAY = "$12/mo";

    expect(getProPriceDisplay()).toBe("$12/mo");
  });

  test("falls back when env value loses its amount", () => {
    process.env.NEXT_PUBLIC_PRO_PRICE_DISPLAY = " a month";

    expect(getProPriceDisplay()).toBe("$9 a month");
  });
});

describe("getRecoveryUrl", () => {
  test("builds recovery URL from app base", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.ragbase.dev";

    expect(getRecoveryUrl("abc123")).toBe(
      "https://www.ragbase.dev/app/recover?token=abc123",
    );
  });
});
