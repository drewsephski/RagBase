import {
  incrementCrawledPages,
} from "@/lib/billing/crawl-limits";
import {
  cancelFirecrawlCrawl,
  fetchFirecrawlCrawlStatus,
  mapFirecrawlStatusToCrawlStatus,
} from "@/lib/ingestion/crawl/firecrawl-crawl";
import { ingestCrawlPage } from "@/lib/ingestion/crawl/page-ingest";
import { parseCrawlMetadata, type CrawlSourceMetadata } from "@/lib/ingestion/crawl/types";
import { createServiceClient } from "@/lib/supabase/server";

const TERMINAL_CRAWL_STATUSES = new Set(["ready", "failed", "canceled"]);

function buildSourceName(hostname: string, pageCount: number): string {
  return `${hostname} (${pageCount} page${pageCount === 1 ? "" : "s"})`;
}

function mergeMetadata(
  current: CrawlSourceMetadata,
  patch: Partial<CrawlSourceMetadata>,
): CrawlSourceMetadata {
  return {
    ...current,
    ...patch,
    ingestedUrls: patch.ingestedUrls ?? current.ingestedUrls ?? [],
  };
}

export async function syncCrawlSource(sourceId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .select("id, workspace_id, name, status, metadata, error_message")
    .eq("id", sourceId)
    .single();

  if (sourceError || !source) {
    return;
  }

  const crawlMeta = parseCrawlMetadata(
    source.metadata as Record<string, unknown> | null,
  );

  if (!crawlMeta || TERMINAL_CRAWL_STATUSES.has(crawlMeta.crawlStatus)) {
    return;
  }

  if (!crawlMeta.firecrawlJobId) {
    return;
  }

  let job;
  try {
    job = await fetchFirecrawlCrawlStatus(
      crawlMeta.firecrawlJobId,
      crawlMeta.crawlRoot,
    );
  } catch (error) {
    console.error("Failed to fetch crawl status:", error);
    return;
  }

  const ingestedUrls = new Set(crawlMeta.ingestedUrls ?? []);
  let pagesIndexed = crawlMeta.pagesIndexed ?? 0;
  let failedPageCount = crawlMeta.failedPageCount ?? 0;
  let newlyIndexed = 0;

  for (const page of job.pages) {
    if (ingestedUrls.has(page.url)) {
      continue;
    }

    ingestedUrls.add(page.url);

    if (page.failed) {
      failedPageCount += 1;
      continue;
    }

    const success = await ingestCrawlPage(sourceId, page);
    if (success) {
      pagesIndexed += 1;
      newlyIndexed += 1;
    } else {
      failedPageCount += 1;
    }
  }

  if (newlyIndexed > 0) {
    await incrementCrawledPages(supabase, source.workspace_id, newlyIndexed);
  }

  const crawlStatus = mapFirecrawlStatusToCrawlStatus(job.status, pagesIndexed);
  const hostname = new URL(crawlMeta.crawlRoot).hostname;
  const nextMetadata = mergeMetadata(crawlMeta, {
    crawlStatus,
    pageCount: pagesIndexed,
    pagesIndexed,
    failedPageCount,
    ingestedUrls: [...ingestedUrls],
    firecrawlCompleted: job.completed,
    firecrawlTotal: job.total,
  });

  let nextSourceStatus = source.status;
  let errorMessage: string | null = source.error_message;

  if (crawlStatus === "ready") {
    nextSourceStatus = "ready";
    errorMessage = null;
  } else if (crawlStatus === "failed") {
    nextSourceStatus = pagesIndexed > 0 ? "ready" : "error";
    errorMessage =
      pagesIndexed > 0
        ? null
        : "Could not crawl this site. Check that it is public and try again.";
  } else if (crawlStatus === "canceled") {
    nextSourceStatus = pagesIndexed > 0 ? "ready" : "error";
    errorMessage = pagesIndexed > 0 ? null : "Crawl canceled before any pages were read.";
  } else {
    nextSourceStatus = "processing";
  }

  await supabase
    .from("sources")
    .update({
      name: buildSourceName(hostname, pagesIndexed),
      status: nextSourceStatus,
      error_message: errorMessage,
      metadata: nextMetadata,
    })
    .eq("id", sourceId);
}

export async function syncActiveCrawlsForWorkspace(
  workspaceId: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { data: sources, error } = await supabase
    .from("sources")
    .select("id, metadata, status")
    .eq("workspace_id", workspaceId)
    .in("status", ["pending", "processing"]);

  if (error) {
    console.error("Failed to list active crawls:", error);
    return;
  }

  for (const source of sources ?? []) {
    const crawlMeta = parseCrawlMetadata(
      source.metadata as Record<string, unknown> | null,
    );

    if (!crawlMeta || TERMINAL_CRAWL_STATUSES.has(crawlMeta.crawlStatus)) {
      continue;
    }

    await syncCrawlSource(source.id);
  }
}

export async function cancelCrawlSource(
  sourceId: string,
  workspaceId: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { data: source, error } = await supabase
    .from("sources")
    .select("id, metadata, status")
    .eq("id", sourceId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !source) {
    throw new Error("Source not found");
  }

  const crawlMeta = parseCrawlMetadata(
    source.metadata as Record<string, unknown> | null,
  );

  if (!crawlMeta) {
    throw new Error("This source is not a site crawl");
  }

  if (crawlMeta.firecrawlJobId) {
    try {
      await cancelFirecrawlCrawl(crawlMeta.firecrawlJobId);
    } catch (cancelError) {
      console.error("Firecrawl cancel failed:", cancelError);
    }
  }

  await supabase
    .from("sources")
    .update({
      metadata: {
        ...crawlMeta,
        crawlStatus: "canceled",
      },
    })
    .eq("id", sourceId);

  await syncCrawlSource(sourceId);
}
