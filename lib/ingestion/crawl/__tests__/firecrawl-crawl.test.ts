import { describe, expect, test } from "@jest/globals";
import { mapFirecrawlStatusToCrawlStatus } from "@/lib/ingestion/crawl/firecrawl-crawl";

describe("mapFirecrawlStatusToCrawlStatus", () => {
  test("maps scraping to crawling before pages are indexed", () => {
    expect(mapFirecrawlStatusToCrawlStatus("scraping", 0)).toBe("crawling");
  });

  test("maps scraping to indexing once pages are indexed", () => {
    expect(mapFirecrawlStatusToCrawlStatus("scraping", 2)).toBe("indexing");
  });

  test("maps completed to ready when pages were indexed", () => {
    expect(mapFirecrawlStatusToCrawlStatus("completed", 3)).toBe("ready");
  });

  test("maps completed to failed when no pages were indexed", () => {
    expect(mapFirecrawlStatusToCrawlStatus("completed", 0)).toBe("failed");
  });

  test("maps cancelled and failed statuses", () => {
    expect(mapFirecrawlStatusToCrawlStatus("cancelled", 1)).toBe("canceled");
    expect(mapFirecrawlStatusToCrawlStatus("failed", 0)).toBe("failed");
  });
});
