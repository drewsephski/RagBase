import { captureServerAnalyticsEvent } from "@/lib/analytics/server";
import type {
  OcrFailureCategory,
  OcrProvider,
  OcrTier,
} from "@/lib/ingestion/ocr/types";

interface OcrAnalyticsBase {
  pageCount: number;
  tier: OcrTier;
  provider: OcrProvider;
}

export async function trackOcrAttempted(
  props: OcrAnalyticsBase,
): Promise<void> {
  await captureServerAnalyticsEvent({
    event: "ocr_attempted",
    properties: {
      page_count: props.pageCount,
      tier: props.tier,
      provider: props.provider,
    },
    timestamp: Date.now(),
  });
}

export async function trackOcrCompleted(
  props: OcrAnalyticsBase,
): Promise<void> {
  await captureServerAnalyticsEvent({
    event: "ocr_completed",
    properties: {
      page_count: props.pageCount,
      tier: props.tier,
      provider: props.provider,
      success: true,
    },
    timestamp: Date.now(),
  });
}

export async function trackOcrFailed(
  props: OcrAnalyticsBase & { failureCategory: OcrFailureCategory },
): Promise<void> {
  await captureServerAnalyticsEvent({
    event: "ocr_failed",
    properties: {
      page_count: props.pageCount,
      tier: props.tier,
      provider: props.provider,
      success: false,
      failure_category: props.failureCategory,
    },
    timestamp: Date.now(),
  });
}
