import { getAppUrl } from "@/lib/site";

export const SITE_NAME = "RagBase";
export const SITE_TAGLINE = "Instant Document Brain";
export const SITE_DESCRIPTION =
  "Chat with PDFs, contracts, notes, and webpages. Cited answers, no signup, private to this browser.";
export const SITE_KEYWORDS = [
  "document AI",
  "PDF chat",
  "cited answers",
  "RAG",
  "contract review",
  "research assistant",
  "URL summarizer",
] as const;

export const APP_PATH = "/app";

export function getSiteUrl(): string {
  return getAppUrl();
}
