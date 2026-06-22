export class UrlScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlScrapeError";
  }
}

export function normalizeUrl(url: string): string {
  let trimmed = url.trim();

  if (!trimmed) {
    throw new UrlScrapeError("URL is required.");
  }

  if (/^https?:\/\//i.test(trimmed)) {
    // Keep explicit http(s) URLs as entered.
  } else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    throw new UrlScrapeError("Only http and https URLs are supported.");
  } else {
    trimmed = `https://${trimmed}`;
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new UrlScrapeError("Enter a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UrlScrapeError("Only http and https URLs are supported.");
  }

  parsed.hash = "";
  return parsed.toString();
}

export function isRootUrl(url: string): boolean {
  const parsed = new URL(normalizeUrl(url));
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";

  return pathname === "/" && parsed.search.length === 0;
}
