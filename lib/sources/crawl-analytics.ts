import { parseCrawlMetadata } from "@/lib/ingestion/crawl/types";
import type { Source } from "@/lib/domain/definitions";
import type { AnalyticsEvent } from "@/lib/analytics/types";

export interface CrawlAnalyticsSnapshot {
  crawlStatus: string;
  pageCount: number;
  failedPageCount: number;
}

export function getCrawlAnalyticsSnapshot(
  source: Source,
): CrawlAnalyticsSnapshot | null {
  const crawlMeta = parseCrawlMetadata(
    source.metadata as Record<string, unknown> | null,
  );

  if (!crawlMeta) {
    return null;
  }

  return {
    crawlStatus: crawlMeta.crawlStatus,
    pageCount: crawlMeta.pageCount,
    failedPageCount: crawlMeta.failedPageCount ?? 0,
  };
}

export function resolveCrawlTerminalEvent(
  previous: CrawlAnalyticsSnapshot | null,
  current: CrawlAnalyticsSnapshot,
): AnalyticsEvent | null {
  if (!previous) {
    return null;
  }

  const wasActive = !["ready", "failed", "canceled"].includes(
    previous.crawlStatus,
  );
  const isTerminal = ["ready", "failed", "canceled"].includes(
    current.crawlStatus,
  );

  if (!wasActive || !isTerminal || previous.crawlStatus === current.crawlStatus) {
    return null;
  }

  if (current.crawlStatus === "canceled") {
    return "crawl_canceled";
  }

  if (current.crawlStatus === "failed") {
    return "crawl_failed";
  }

  if (current.failedPageCount > 0 && current.pageCount > 0) {
    return "crawl_partial_success";
  }

  if (current.crawlStatus === "ready" && current.pageCount > 0) {
    return "crawl_completed";
  }

  return null;
}

export function buildCrawlEventProperties(
  source: Source,
  snapshot: CrawlAnalyticsSnapshot,
): Record<string, string | number | boolean> {
  const crawlMeta = parseCrawlMetadata(
    source.metadata as Record<string, unknown> | null,
  );

  return {
    source_id: source.id,
    page_count: snapshot.pageCount,
    failed_page_count: snapshot.failedPageCount,
    crawl_root: crawlMeta?.crawlRoot ?? "",
  };
}
