import type { Source } from "@/lib/domain/definitions";
import { parseCrawlMetadata, type CrawlStatus } from "@/lib/ingestion/crawl/types";

function getCrawlStatusLabel(
  crawlStatus: CrawlStatus,
  metadata?: ReturnType<typeof parseCrawlMetadata>,
): string {
  switch (crawlStatus) {
    case "queued":
      return "Starting crawl…";
    case "crawling": {
      const completed = metadata?.firecrawlCompleted;
      const total = metadata?.firecrawlTotal;
      if (typeof completed === "number" && typeof total === "number" && total > 0) {
        return `Reading pages… (${completed}/${total})`;
      }
      return "Reading pages…";
    }
    case "indexing":
      return "Indexing site…";
    case "ready":
      return "Ready";
    case "failed":
      return "Could not crawl this site";
    case "canceled":
      return "Crawl canceled";
    default:
      return crawlStatus;
  }
}

export function getCrawlSourceStatusLabel(source: Source): string | null {
  const crawlMeta = parseCrawlMetadata(
    source.metadata as Record<string, unknown> | null,
  );

  if (!crawlMeta) {
    return null;
  }

  if (source.status === "ready" && crawlMeta.pageCount > 0) {
    if ((crawlMeta.failedPageCount ?? 0) > 0) {
      return `Ready · ${crawlMeta.failedPageCount} pages could not be read`;
    }
    return "Ready";
  }

  return getCrawlStatusLabel(crawlMeta.crawlStatus, crawlMeta);
}

export function isActiveCrawlSource(source: Source): boolean {
  const crawlMeta = parseCrawlMetadata(
    source.metadata as Record<string, unknown> | null,
  );

  if (!crawlMeta) {
    return false;
  }

  return !["ready", "failed", "canceled"].includes(crawlMeta.crawlStatus);
}
