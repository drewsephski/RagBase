import Firecrawl from "@mendable/firecrawl-js";

export interface FirecrawlScrapeMetadata {
  title?: string;
  sourceURL?: string;
  url?: string;
  statusCode?: number;
  error?: string;
}

export interface FirecrawlScrapeResult {
  markdown?: string;
  metadata?: FirecrawlScrapeMetadata;
}

const SCRAPE_CACHE_MAX_AGE_MS = 172_800_000;
const SCRAPE_TIMEOUT_MS = 60_000;

type ScrapeOptions = Parameters<Firecrawl["scrape"]>[1];

function getFirecrawlApiKey(): string {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing FIRECRAWL_API_KEY");
  }

  return apiKey;
}

let client: Firecrawl | null = null;

export function getFirecrawlClient(): Firecrawl {
  if (!client) {
    client = new Firecrawl({ apiKey: getFirecrawlApiKey() });
  }

  return client;
}

function buildScrapeAttempts(): ScrapeOptions[] {
  const baseOptions: ScrapeOptions = {
    formats: ["markdown"],
    maxAge: SCRAPE_CACHE_MAX_AGE_MS,
    timeout: SCRAPE_TIMEOUT_MS,
    proxy: "auto",
    blockAds: true,
  };

  return [
    { ...baseOptions, onlyMainContent: true },
    { ...baseOptions, onlyMainContent: false },
    { ...baseOptions, onlyMainContent: false, waitFor: 3000 },
  ];
}

function extractScrapeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Could not fetch content from that URL.";
}

export async function scrapePageWithFirecrawl(
  url: string,
): Promise<FirecrawlScrapeResult> {
  const firecrawl = getFirecrawlClient();
  const attempts = buildScrapeAttempts();
  let lastResult: FirecrawlScrapeResult = {};
  let lastError: Error | null = null;

  for (const options of attempts) {
    try {
      lastResult = await firecrawl.scrape(url, options);

      if (lastResult.markdown?.trim()) {
        return lastResult;
      }
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(extractScrapeErrorMessage(error));
    }
  }

  if (lastResult.markdown?.trim()) {
    return lastResult;
  }

  if (lastError) {
    throw lastError;
  }

  return lastResult;
}
