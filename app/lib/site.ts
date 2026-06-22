export const SITE_NAME = "RagBase";
export const SITE_TAGLINE = "Instant Document Brain";
export const SITE_DESCRIPTION =
  "Drop a PDF, contract, or URL and ask questions with cited answers. Private to this browser.";
export const SITE_KEYWORDS = [
  "document AI",
  "PDF chat",
  "cited answers",
  "RAG",
  "contract review",
  "research assistant",
  "URL summarizer",
] as const;

const DEFAULT_SITE_URL = "https://ragbase.dev";

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return DEFAULT_SITE_URL;
}
