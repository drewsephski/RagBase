import { describe, expect, test } from "@jest/globals";
import { getCrawlSourceStatusLabel } from "@/lib/sources/crawl-status";
import type { Source } from "@/lib/domain/definitions";

function createCrawlSource(
  status: Source["status"],
  metadata: Record<string, unknown>,
): Source {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    workspace_id: "22222222-2222-4222-8222-222222222222",
    type: "url",
    name: "docs.example.com (2 pages)",
    status,
    storage_path: null,
    metadata,
    error_message: null,
    created_at: "2026-06-23T00:00:00.000Z",
  };
}

describe("getCrawlSourceStatusLabel", () => {
  test("shows progress while crawling with counts", () => {
    const label = getCrawlSourceStatusLabel(
      createCrawlSource("processing", {
        mode: "crawl",
        crawlRoot: "https://docs.example.com/",
        pageCount: 0,
        firecrawlJobId: "job-1",
        crawlStatus: "crawling",
        firecrawlCompleted: 4,
        firecrawlTotal: 10,
      }),
    );

    expect(label).toBe("Reading pages… (4/10)");
  });

  test("shows partial failure notice when ready with failed pages", () => {
    const label = getCrawlSourceStatusLabel(
      createCrawlSource("ready", {
        mode: "crawl",
        crawlRoot: "https://docs.example.com/",
        pageCount: 3,
        firecrawlJobId: "job-1",
        crawlStatus: "ready",
        failedPageCount: 2,
      }),
    );

    expect(label).toBe("Ready · 2 pages could not be read");
  });
});
