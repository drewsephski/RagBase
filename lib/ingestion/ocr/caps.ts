import { LIMITS } from "@/lib/domain/definitions";
import type { OcrTier } from "@/lib/ingestion/ocr/types";

export class OcrPageCapError extends Error {
  pageCount: number;
  cap: number;
  tier: OcrTier;

  constructor(pageCount: number, cap: number, tier: OcrTier) {
    const tierLabel = tier === "byok" ? "with your OpenRouter key" : "on the free tier";
    super(
      `This scanned PDF has ${pageCount} pages. OCR supports up to ${cap} pages ${tierLabel}.`,
    );
    this.name = "OcrPageCapError";
    this.pageCount = pageCount;
    this.cap = cap;
    this.tier = tier;
  }
}

export function resolveOcrTier(hasUserKey: boolean): OcrTier {
  return hasUserKey ? "byok" : "free";
}

export function getOcrPageCap(tier: OcrTier): number {
  return tier === "byok" ? LIMITS.OCR_PAGES_BYOK : LIMITS.OCR_PAGES_FREE;
}

export function selectOcrProvider(tier: OcrTier): "firecrawl" | "openrouter_vision" {
  return tier === "byok" ? "openrouter_vision" : "firecrawl";
}

export interface PreparedOcrRun {
  tier: OcrTier;
  provider: ReturnType<typeof selectOcrProvider>;
  openRouterKey?: string;
}

export function enforceOcrPageCap(pageCount: number, tier: OcrTier): void {
  const cap = getOcrPageCap(tier);

  if (pageCount > cap) {
    throw new OcrPageCapError(pageCount, cap, tier);
  }
}

export function prepareOcrRun(
  pageCount: number,
  openRouterKey?: string,
): PreparedOcrRun {
  const trimmedKey = openRouterKey?.trim() ?? "";
  const tier = resolveOcrTier(trimmedKey.length > 0);
  const provider = selectOcrProvider(tier);

  enforceOcrPageCap(pageCount, tier);

  return {
    tier,
    provider,
    ...(trimmedKey.length > 0 ? { openRouterKey: trimmedKey } : {}),
  };
}
