import { normalizeUrl, UrlScrapeError } from "@/lib/ingestion/url-utils";
import {
  scrapePageWithFirecrawl,
  type FirecrawlScrapeResult,
} from "@/lib/ingestion/firecrawl-client";

export {
  isRootUrl,
  normalizeUrl,
  UrlScrapeError,
} from "@/lib/ingestion/url-utils";

export interface ScrapedUrlContent {
  url: string;
  title: string;
  markdown: string;
}

function parsedHostnameTitle(url: string): string {
  return new URL(url).hostname;
}

function resolveTitle(
  url: string,
  metadata: FirecrawlScrapeResult["metadata"],
): string {
  const title = metadata?.title?.trim();
  return title && title.length > 0 ? title : parsedHostnameTitle(url);
}

function resolveCanonicalUrl(
  url: string,
  metadata: FirecrawlScrapeResult["metadata"],
): string {
  const canonical =
    metadata?.sourceURL?.trim() || metadata?.url?.trim() || url;

  try {
    return normalizeUrl(canonical);
  } catch {
    return url;
  }
}

function buildScrapeFailureMessage(
  url: string,
  result: FirecrawlScrapeResult,
): string {
  const statusCode = result.metadata?.statusCode;
  const metadataError = result.metadata?.error?.trim();

  if (statusCode === 401 || statusCode === 403) {
    return "That page requires sign-in or is not publicly accessible.";
  }

  if (statusCode === 404) {
    return "That page could not be found. Check the link and try again.";
  }

  if (statusCode && statusCode >= 400) {
    return metadataError
      ? `Could not fetch content (${statusCode}: ${metadataError}).`
      : `Could not fetch content from that page (HTTP ${statusCode}).`;
  }

  if (metadataError) {
    return `Could not fetch content: ${metadataError}`;
  }

  return `Could not extract readable content from ${new URL(url).hostname}. Try a direct link to a specific page.`;
}

export function parseScrapeResult(
  url: string,
  result: FirecrawlScrapeResult,
): ScrapedUrlContent {
  const markdown = result.markdown?.trim() ?? "";

  if (markdown.length === 0) {
    throw new UrlScrapeError(buildScrapeFailureMessage(url, result));
  }

  const canonicalUrl = resolveCanonicalUrl(url, result.metadata);

  return {
    url: canonicalUrl,
    title: resolveTitle(canonicalUrl, result.metadata),
    markdown,
  };
}

export async function scrapeUrl(url: string): Promise<ScrapedUrlContent> {
  const normalizedUrl = normalizeUrl(url);

  try {
    const result = await scrapePageWithFirecrawl(normalizedUrl);
    return parseScrapeResult(normalizedUrl, result);
  } catch (error) {
    if (error instanceof UrlScrapeError) {
      throw error;
    }

    if (error instanceof Error && error.message.includes("FIRECRAWL_API_KEY")) {
      throw new UrlScrapeError(
        "URL scraping is not configured. Add FIRECRAWL_API_KEY and try again.",
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Could not fetch content from that URL.";

    throw new UrlScrapeError(message);
  }
}
