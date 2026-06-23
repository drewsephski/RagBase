import { afterEach, describe, expect, test } from "@jest/globals";
import { getAppUrl, getProPriceDisplay, getRecoveryUrl } from "@/lib/site";

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
