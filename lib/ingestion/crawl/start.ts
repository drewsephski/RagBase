import {
  assertCrawlAllowed,
  getCrawlLimitsConfig,
  incrementCrawlAttempt,
} from "@/lib/billing/crawl-limits";
import { requireProPlan } from "@/lib/billing/pro-plan";
import { fetchWorkspaceBilling } from "@/lib/billing/subscription-status";
import { mapBillingRow } from "@/lib/billing/types";
import { checkSourceLimit } from "@/lib/limits";
import {
  startFirecrawlCrawl,
} from "@/lib/ingestion/crawl/firecrawl-crawl";
import { normalizeUrl, UrlScrapeError } from "@/lib/ingestion/url-utils";
import type { CrawlSourceMetadata } from "@/lib/ingestion/crawl/types";
import { createServiceClient } from "@/lib/supabase/server";

function buildCrawlSourceName(hostname: string, pageCount = 0): string {
  return `${hostname} (${pageCount} page${pageCount === 1 ? "" : "s"})`;
}

export interface StartCrawlInput {
  workspaceId: string;
  url: string;
}

export interface StartCrawlOutput {
  sourceId: string;
  name: string;
  status: string;
}

export async function startSiteCrawl(
  input: StartCrawlInput,
): Promise<StartCrawlOutput> {
  const supabase = createServiceClient();
  const billingRow = await fetchWorkspaceBilling(supabase, input.workspaceId);

  if (!billingRow) {
    throw new Error("Workspace not found");
  }

  const billing = mapBillingRow(billingRow);
  requireProPlan(billing);

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeUrl(input.url);
  } catch (error) {
    if (error instanceof UrlScrapeError) {
      throw error;
    }
    throw error;
  }

  const limits = getCrawlLimitsConfig();
  await checkSourceLimit(input.workspaceId);
  await assertCrawlAllowed(supabase, billing, limits);

  const hostname = new URL(normalizedUrl).hostname;
  const crawlConfig = {
    maxDepth: limits.maxDepth,
    maxPages: limits.maxPages,
  };

  const { data: source, error: insertError } = await supabase
    .from("sources")
    .insert({
      workspace_id: input.workspaceId,
      type: "url",
      name: buildCrawlSourceName(hostname),
      status: "pending",
      storage_path: null,
      metadata: {
        mode: "crawl",
        crawlRoot: normalizedUrl,
        pageCount: 0,
        firecrawlJobId: "",
        crawlStatus: "queued",
        crawlConfig,
        ingestedUrls: [],
        pagesIndexed: 0,
        failedPageCount: 0,
      } satisfies Partial<CrawlSourceMetadata>,
    })
    .select("id, name, status")
    .single();

  if (insertError || !source) {
    throw new Error("Failed to create crawl source");
  }

  try {
    const job = await startFirecrawlCrawl(normalizedUrl);
    await incrementCrawlAttempt(supabase, input.workspaceId);

    const metadata: CrawlSourceMetadata = {
      mode: "crawl",
      crawlRoot: normalizedUrl,
      pageCount: 0,
      firecrawlJobId: job.jobId,
      crawlStatus: "crawling",
      crawlConfig,
      ingestedUrls: [],
      pagesIndexed: 0,
      failedPageCount: 0,
    };

    await supabase
      .from("sources")
      .update({
        status: "processing",
        metadata,
      })
      .eq("id", source.id);

    return {
      sourceId: source.id,
      name: source.name,
      status: "processing",
    };
  } catch (error) {
    await supabase
      .from("sources")
      .update({
        status: "error",
        error_message:
          error instanceof Error
            ? error.message
            : "Could not start site crawl. Try again later.",
        metadata: {
          mode: "crawl",
          crawlRoot: normalizedUrl,
          pageCount: 0,
          firecrawlJobId: "",
          crawlStatus: "failed",
          crawlConfig,
        },
      })
      .eq("id", source.id);

    throw error;
  }
}