export type CrawlStatus =
  | "queued"
  | "crawling"
  | "indexing"
  | "ready"
  | "failed"
  | "canceled";

export interface CrawlConfigSnapshot {
  maxDepth: number;
  maxPages: number;
}

export interface CrawlSourceMetadata {
  mode: "crawl";
  crawlRoot: string;
  pageCount: number;
  firecrawlJobId: string;
  crawlStatus: CrawlStatus;
  failedPageCount?: number;
  pagesIndexed?: number;
  crawlConfig?: CrawlConfigSnapshot;
  ingestedUrls?: string[];
  firecrawlCompleted?: number;
  firecrawlTotal?: number;
}

function isCrawlSourceMetadata(
  metadata: Record<string, unknown> | null | undefined,
): metadata is CrawlSourceMetadata & Record<string, unknown> {
  return metadata?.mode === "crawl";
}

export function parseCrawlMetadata(
  metadata: Record<string, unknown> | null | undefined,
): CrawlSourceMetadata | null {
  if (!isCrawlSourceMetadata(metadata)) {
    return null;
  }

  const crawlRoot = metadata.crawlRoot;
  const firecrawlJobId = metadata.firecrawlJobId;
  const crawlStatus = metadata.crawlStatus;

  if (
    typeof crawlRoot !== "string" ||
    typeof firecrawlJobId !== "string" ||
    typeof crawlStatus !== "string"
  ) {
    return null;
  }

  return {
    mode: "crawl",
    crawlRoot,
    pageCount: typeof metadata.pageCount === "number" ? metadata.pageCount : 0,
    firecrawlJobId,
    crawlStatus: crawlStatus as CrawlStatus,
    failedPageCount:
      typeof metadata.failedPageCount === "number"
        ? metadata.failedPageCount
        : undefined,
    pagesIndexed:
      typeof metadata.pagesIndexed === "number"
        ? metadata.pagesIndexed
        : undefined,
    crawlConfig:
      metadata.crawlConfig && typeof metadata.crawlConfig === "object"
        ? (metadata.crawlConfig as CrawlConfigSnapshot)
        : undefined,
    ingestedUrls: Array.isArray(metadata.ingestedUrls)
      ? metadata.ingestedUrls.filter((url): url is string => typeof url === "string")
      : [],
    firecrawlCompleted:
      typeof metadata.firecrawlCompleted === "number"
        ? metadata.firecrawlCompleted
        : undefined,
    firecrawlTotal:
      typeof metadata.firecrawlTotal === "number"
        ? metadata.firecrawlTotal
        : undefined,
  };
}
