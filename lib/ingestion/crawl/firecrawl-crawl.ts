import { getFirecrawlClient } from "@/lib/ingestion/firecrawl-client";
import { getCrawlLimitsConfig } from "@/lib/billing/crawl-limits";

interface FirecrawlDocument {
  markdown?: string;
  metadata?: {
    title?: string;
    sourceURL?: string;
    url?: string;
    error?: string;
  };
}

export interface StartCrawlResult {
  jobId: string;
  statusUrl: string;
}

export interface CrawlJobSnapshot {
  jobId: string;
  status: "scraping" | "completed" | "failed" | "cancelled";
  completed: number;
  total: number;
  pages: CrawlPageSnapshot[];
}

export interface CrawlPageSnapshot {
  url: string;
  title: string;
  markdown: string;
  path: string;
  failed: boolean;
}

function resolvePageUrl(document: FirecrawlDocument): string | null {
  const metadata = document.metadata;
  const candidate =
    metadata?.sourceURL?.trim() ||
    metadata?.url?.trim() ||
    (typeof metadata?.sourceURL === "string" ? metadata.sourceURL : null);

  return candidate && candidate.length > 0 ? candidate : null;
}

function resolvePageTitle(url: string, document: FirecrawlDocument): string {
  const title = document.metadata?.title?.trim();
  if (title && title.length > 0) {
    return title;
  }

  try {
    const pathname = new URL(url).pathname;
    if (pathname && pathname !== "/") {
      return pathname.split("/").filter(Boolean).pop() ?? new URL(url).hostname;
    }
  } catch {
    // fall through
  }

  return new URL(url).hostname;
}

function resolvePagePath(crawlRoot: string, pageUrl: string): string {
  try {
    const root = new URL(crawlRoot);
    const page = new URL(pageUrl);

    if (root.hostname !== page.hostname) {
      return page.pathname || "/";
    }

    const rootPath = root.pathname.replace(/\/$/, "") || "";
    let pathname = page.pathname || "/";

    if (rootPath && pathname.startsWith(rootPath)) {
      pathname = pathname.slice(rootPath.length) || "/";
    }

    return pathname.startsWith("/") ? pathname : `/${pathname}`;
  } catch {
    return "/";
  }
}

function mapDocumentsToPages(
  crawlRoot: string,
  documents: FirecrawlDocument[],
): CrawlPageSnapshot[] {
  const pages: CrawlPageSnapshot[] = [];

  for (const document of documents) {
    const url = resolvePageUrl(document);
    if (!url) {
      continue;
    }

    const markdown = document.markdown?.trim() ?? "";
    const failed = markdown.length === 0;

    pages.push({
      url,
      title: resolvePageTitle(url, document),
      markdown,
      path: resolvePagePath(crawlRoot, url),
      failed,
    });
  }

  return pages;
}

export async function startFirecrawlCrawl(url: string): Promise<StartCrawlResult> {
  const limits = getCrawlLimitsConfig();
  const firecrawl = getFirecrawlClient();

  const response = await firecrawl.startCrawl(url, {
    limit: limits.maxPages,
    maxDiscoveryDepth: limits.maxDepth,
    scrapeOptions: {
      formats: ["markdown"],
      onlyMainContent: true,
    },
  });

  return {
    jobId: response.id,
    statusUrl: response.url,
  };
}

export async function fetchFirecrawlCrawlStatus(
  jobId: string,
  crawlRoot: string,
): Promise<CrawlJobSnapshot> {
  const firecrawl = getFirecrawlClient();
  const job = await firecrawl.getCrawlStatus(jobId, { autoPaginate: true });

  return {
    jobId,
    status: job.status,
    completed: job.completed,
    total: job.total,
    pages: mapDocumentsToPages(crawlRoot, job.data ?? []),
  };
}

export async function cancelFirecrawlCrawl(jobId: string): Promise<boolean> {
  const firecrawl = getFirecrawlClient();
  return firecrawl.cancelCrawl(jobId);
}

export function mapFirecrawlStatusToCrawlStatus(
  status: CrawlJobSnapshot["status"],
  pagesIndexed: number,
): import("@/lib/ingestion/crawl/types").CrawlStatus {
  switch (status) {
    case "scraping":
      return pagesIndexed > 0 ? "indexing" : "crawling";
    case "completed":
      return pagesIndexed > 0 ? "ready" : "failed";
    case "cancelled":
      return "canceled";
    case "failed":
      return "failed";
    default:
      return "crawling";
  }
}
