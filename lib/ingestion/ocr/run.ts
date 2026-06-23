import {
  OcrPageCapError,
  prepareOcrRun,
  selectOcrProvider,
} from "@/lib/ingestion/ocr/caps";
import {
  trackOcrAttempted,
  trackOcrCompleted,
  trackOcrFailed,
} from "@/lib/ingestion/ocr/analytics";
import { ocrPdfWithFirecrawl } from "@/lib/ingestion/ocr/firecrawl-ocr";
import { OcrProviderError } from "@/lib/ingestion/ocr/errors";
import { ocrPdfWithVision } from "@/lib/ingestion/ocr/vision-ocr";
import type {
  OcrFailureCategory,
  OcrProvider,
  OcrRunResult,
  OcrTier,
} from "@/lib/ingestion/ocr/types";

export interface RunPdfOcrOptions {
  buffer: Buffer;
  filename: string;
  pageCount: number;
  openRouterKey?: string;
}

function classifyOcrFailure(error: unknown): OcrFailureCategory {
  if (error instanceof OcrPageCapError) {
    return "over_cap";
  }

  if (error instanceof OcrProviderError) {
    if (/key is required|openrouter key/i.test(error.message)) {
      return "missing_key";
    }

    if (/no readable text|no text/i.test(error.message)) {
      return "empty_result";
    }

    return "provider_error";
  }

  return "unknown";
}

export async function runPdfOcr(options: RunPdfOcrOptions): Promise<OcrRunResult> {
  let tier: OcrTier;
  let provider: OcrProvider;
  let openRouterKey: string | undefined;

  try {
    ({ tier, provider, openRouterKey } = prepareOcrRun(
      options.pageCount,
      options.openRouterKey,
    ));
  } catch (error) {
    if (error instanceof OcrPageCapError) {
      await trackOcrFailed({
        pageCount: options.pageCount,
        tier: error.tier,
        provider: selectOcrProvider(error.tier),
        failureCategory: "over_cap",
      });
    }

    throw error;
  }

  try {
    await trackOcrAttempted({
      pageCount: options.pageCount,
      tier,
      provider,
    });

    let pages;

    if (provider === "openrouter_vision") {
      if (!openRouterKey) {
        throw new OcrProviderError(
          "OpenRouter API key is required for larger scans.",
        );
      }

      pages = await ocrPdfWithVision(
        options.buffer,
        options.filename,
        options.pageCount,
        openRouterKey,
      );
    } else {
      pages = await ocrPdfWithFirecrawl(
        options.buffer,
        options.filename,
        options.pageCount,
      );
    }

    await trackOcrCompleted({
      pageCount: options.pageCount,
      tier,
      provider,
    });

    return { pages, provider, tier };
  } catch (error) {
    await trackOcrFailed({
      pageCount: options.pageCount,
      tier,
      provider,
      failureCategory: classifyOcrFailure(error),
    });

    throw error;
  }
}
