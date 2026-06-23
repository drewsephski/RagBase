import { describe, expect, test } from "@jest/globals";
import { sanitizeAnalyticsProperties } from "@/lib/analytics/sanitize";

describe("OCR analytics sanitization", () => {
  test("keeps OCR metadata and strips document text or keys", () => {
    const result = sanitizeAnalyticsProperties({
      page_count: 8,
      tier: "free",
      provider: "firecrawl",
      success: true,
      failure_category: "over_cap",
      document: "full scanned page text",
      openRouterKey: "sk-or-secret",
      text: "extracted OCR output",
    });

    expect(result).toEqual({
      page_count: 8,
      tier: "free",
      provider: "firecrawl",
      success: true,
      failure_category: "over_cap",
    });
  });
});
