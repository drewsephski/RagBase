import {
  OcrPageCapError,
  getOcrPageCap,
  prepareOcrRun,
  selectOcrProvider,
} from "@/lib/ingestion/ocr/caps";
import {
  trackOcrAttempted,
  trackOcrCompleted,
  trackOcrFailed,
} from "@/lib/ingestion/ocr/analytics";
import { extractOcrPages } from "@/lib/ingestion/ocr/providers";
import type {
  OcrProvider,
  OcrRunResult,
  OcrTier,
} from "@/lib/ingestion/ocr/types";
import { classifyOcrAnalyticsFailure } from "@/lib/ingestion/user-errors";

export interface RunPdfOcrOptions {
  buffer: Buffer;
  filename: string;
  pageCount: number;
  openRouterKey?: string;
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

    const pages = await extractOcrPages(provider, {
      buffer: options.buffer,
      filename: options.filename,
      pageCount: options.pageCount,
      maxPages: getOcrPageCap(tier),
      openRouterKey,
    });

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
      failureCategory: classifyOcrAnalyticsFailure(error),
    });

    throw error;
  }
}
