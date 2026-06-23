import type { PdfPage } from "@/lib/ingestion/pdf";

export type OcrTier = "free" | "byok";

export type OcrProvider = "firecrawl" | "openrouter_vision";

export type OcrFailureCategory =
  | "over_cap"
  | "provider_error"
  | "empty_result"
  | "missing_key"
  | "unknown";

export interface OcrRunResult {
  pages: PdfPage[];
  provider: OcrProvider;
  tier: OcrTier;
}
