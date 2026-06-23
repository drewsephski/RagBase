import { describe, expect, test } from "@jest/globals";
import {
  buildCrawlEventProperties,
  getCrawlAnalyticsSnapshot,
  resolveCrawlTerminalEvent,
} from "@/lib/sources/crawl-analytics";
import type { Source } from "@/lib/domain/definitions";

function createCrawlSource(
  overrides: Partial<Source> & {
    crawlStatus: string;
    pageCount?: number;
    failedPageCount?: number;
  },
): Source {
  const {
    crawlStatus,
    pageCount = 0,
    failedPageCount = 0,
    ...sourceOverrides
  } = overrides;

  return {
    id: "11111111-1111-4111-8111-111111111111",
    workspace_id: "22222222-2222-4222-8222-222222222222",
    type: "url",
    name: "example.com (3 pages)",
    status: crawlStatus === "failed" ? "error" : "ready",
    storage_path: null,
    metadata: {
      mode: "crawl",
      crawlRoot: "https://example.com/",
      pageCount,
      firecrawlJobId: "job-123",
      crawlStatus,
      failedPageCount,
      pagesIndexed: pageCount,
      ingestedUrls: [],
    },
    error_message: null,
    created_at: "2026-06-23T00:00:00.000Z",
    ...sourceOverrides,
  };
}

describe("getCrawlAnalyticsSnapshot", () => {
  test("returns null for non-crawl sources", () => {
    const source: Source = {
      id: "11111111-1111-4111-8111-111111111111",
      workspace_id: "22222222-2222-4222-8222-222222222222",
      type: "url",
      name: "Article",
      status: "ready",
      storage_path: null,
      metadata: null,
      created_at: "2026-06-23T00:00:00.000Z",
    };

    expect(getCrawlAnalyticsSnapshot(source)).toBeNull();
  });

  test("extracts crawl counters from metadata", () => {
    const snapshot = getCrawlAnalyticsSnapshot(
      createCrawlSource({
        crawlStatus: "ready",
        pageCount: 4,
        failedPageCount: 1,
      }),
    );

    expect(snapshot).toEqual({
      crawlStatus: "ready",
      pageCount: 4,
      failedPageCount: 1,
    });
  });
});

describe("resolveCrawlTerminalEvent", () => {
  test("returns crawl_completed when crawl finishes with pages", () => {
    expect(
      resolveCrawlTerminalEvent(
        { crawlStatus: "crawling", pageCount: 0, failedPageCount: 0 },
        { crawlStatus: "ready", pageCount: 5, failedPageCount: 0 },
      ),
    ).toBe("crawl_completed");
  });

  test("returns crawl_partial_success when some pages fail", () => {
    expect(
      resolveCrawlTerminalEvent(
        { crawlStatus: "indexing", pageCount: 2, failedPageCount: 0 },
        { crawlStatus: "ready", pageCount: 2, failedPageCount: 1 },
      ),
    ).toBe("crawl_partial_success");
  });

  test("returns crawl_failed when crawl ends with no pages", () => {
    expect(
      resolveCrawlTerminalEvent(
        { crawlStatus: "crawling", pageCount: 0, failedPageCount: 0 },
        { crawlStatus: "failed", pageCount: 0, failedPageCount: 0 },
      ),
    ).toBe("crawl_failed");
  });

  test("returns crawl_canceled when user cancels", () => {
    expect(
      resolveCrawlTerminalEvent(
        { crawlStatus: "crawling", pageCount: 1, failedPageCount: 0 },
        { crawlStatus: "canceled", pageCount: 1, failedPageCount: 0 },
      ),
    ).toBe("crawl_canceled");
  });

  test("returns null when crawl status is unchanged", () => {
    expect(
      resolveCrawlTerminalEvent(
        { crawlStatus: "crawling", pageCount: 1, failedPageCount: 0 },
        { crawlStatus: "crawling", pageCount: 2, failedPageCount: 0 },
      ),
    ).toBeNull();
  });
});

describe("buildCrawlEventProperties", () => {
  test("includes crawl metadata in analytics payload", () => {
    const source = createCrawlSource({
      crawlStatus: "ready",
      pageCount: 3,
      failedPageCount: 0,
    });

    expect(
      buildCrawlEventProperties(source, {
        crawlStatus: "ready",
        pageCount: 3,
        failedPageCount: 0,
      }),
    ).toEqual({
      source_id: source.id,
      page_count: 3,
      failed_page_count: 0,
      crawl_root: "https://example.com/",
    });
  });
});
