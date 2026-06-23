import { LimitError } from "@/lib/limits";
import type { BillingWorkspace } from "@/lib/billing/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CrawlLimitsConfig {
  maxDepth: number;
  maxPages: number;
  maxActivePerWorkspace: number;
  maxCrawlsPerPeriod: number;
  maxPagesPerPeriod: number;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getCrawlLimitsConfig(): CrawlLimitsConfig {
  return {
    maxDepth: parsePositiveInt(process.env.CRAWL_MAX_DEPTH, 2),
    maxPages: parsePositiveInt(process.env.CRAWL_MAX_PAGES, 25),
    maxActivePerWorkspace: parsePositiveInt(
      process.env.CRAWL_MAX_ACTIVE_PER_WORKSPACE,
      1,
    ),
    maxCrawlsPerPeriod: parsePositiveInt(
      process.env.CRAWL_MAX_CRAWLS_PER_PERIOD,
      3,
    ),
    maxPagesPerPeriod: parsePositiveInt(
      process.env.CRAWL_MAX_PAGES_PER_PERIOD,
      75,
    ),
  };
}

export interface CrawlQuotaSummary {
  crawlsUsed: number;
  crawlsLimit: number;
  pagesUsed: number;
  pagesLimit: number;
}

export function buildCrawlQuotaSummary(
  billing: BillingWorkspace,
  limits: CrawlLimitsConfig = getCrawlLimitsConfig(),
): CrawlQuotaSummary {
  return {
    crawlsUsed: billing.crawlCountPeriod,
    crawlsLimit: limits.maxCrawlsPerPeriod,
    pagesUsed: billing.crawledPagesPeriod,
    pagesLimit: limits.maxPagesPerPeriod,
  };
}

const ACTIVE_CRAWL_STATUSES = new Set(["queued", "crawling", "indexing"]);

async function countActiveCrawls(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("sources")
    .select("metadata, status")
    .eq("workspace_id", workspaceId)
    .in("status", ["pending", "processing"]);

  if (error) {
    throw new Error(`Failed to count active crawls: ${error.message}`);
  }

  return (data ?? []).filter((row) => {
    const metadata = row.metadata;
    if (!metadata || typeof metadata !== "object") {
      return false;
    }

    const mode = (metadata as Record<string, unknown>).mode;
    const crawlStatus = (metadata as Record<string, unknown>).crawlStatus;

    return (
      mode === "crawl" &&
      typeof crawlStatus === "string" &&
      ACTIVE_CRAWL_STATUSES.has(crawlStatus)
    );
  }).length;
}

export async function assertCrawlAllowed(
  supabase: SupabaseClient,
  billing: BillingWorkspace,
  limits: CrawlLimitsConfig = getCrawlLimitsConfig(),
): Promise<void> {
  const activeCrawls = await countActiveCrawls(supabase, billing.id);

  if (activeCrawls >= limits.maxActivePerWorkspace) {
    throw new LimitError(
      "A site crawl is already in progress. Wait for it to finish before starting another.",
    );
  }

  if (billing.crawlCountPeriod >= limits.maxCrawlsPerPeriod) {
    throw new LimitError(
      `You've used all ${limits.maxCrawlsPerPeriod} site crawls for this billing period.`,
    );
  }

  if (billing.crawledPagesPeriod + limits.maxPages > limits.maxPagesPerPeriod) {
    throw new LimitError(
      `Not enough page quota left this period (${limits.maxPagesPerPeriod - billing.crawledPagesPeriod} of ${limits.maxPagesPerPeriod} remaining).`,
    );
  }
}

export async function incrementCrawlAttempt(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from("workspaces")
    .select("crawl_count_period")
    .eq("id", workspaceId)
    .single();

  if (fetchError || !data) {
    throw new Error("Failed to update crawl usage");
  }

  const { error } = await supabase
    .from("workspaces")
    .update({ crawl_count_period: (data.crawl_count_period ?? 0) + 1 })
    .eq("id", workspaceId);

  if (error) {
    throw new Error(`Failed to increment crawl count: ${error.message}`);
  }
}

export async function incrementCrawledPages(
  supabase: SupabaseClient,
  workspaceId: string,
  pageCount: number,
): Promise<void> {
  if (pageCount <= 0) {
    return;
  }

  const { data, error: fetchError } = await supabase
    .from("workspaces")
    .select("crawled_pages_period")
    .eq("id", workspaceId)
    .single();

  if (fetchError || !data) {
    throw new Error("Failed to update crawl page usage");
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      crawled_pages_period: (data.crawled_pages_period ?? 0) + pageCount,
    })
    .eq("id", workspaceId);

  if (error) {
    throw new Error(`Failed to increment crawled pages: ${error.message}`);
  }
}
