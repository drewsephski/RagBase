import { describe, expect, test } from "@jest/globals";
import { sanitizeAnalyticsProperties } from "@/lib/analytics/sanitize";

describe("sanitizeAnalyticsProperties", () => {
  test("removes sensitive keys and truncates long strings", () => {
    const result = sanitizeAnalyticsProperties({
      feature: "full_site_crawl",
      message: "secret document text",
      answer: "raw assistant answer",
      openRouterKey: "sk-or-test",
      workspace_secret: "ws-secret",
      note: "a".repeat(250),
    });

    expect(result).toEqual({
      feature: "full_site_crawl",
      note: "a".repeat(200),
    });
  });
});
