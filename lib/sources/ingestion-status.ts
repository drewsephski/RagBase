import type { Source, SourceStatus } from "@/lib/domain/definitions";
import { isSourceOcrProcessing } from "@/lib/domain/definitions";
import {
  classifyIngestionError,
  getIngestionFailureDisplay,
  getIngestionRecoveryAction,
} from "@/lib/ingestion/user-errors";
import { getCrawlSourceStatusLabel } from "@/lib/sources/crawl-status";

export function getStatusLabel(source: Source | SourceStatus): string {
  if (typeof source === "object") {
    const crawlLabel = getCrawlSourceStatusLabel(source);
    if (crawlLabel) {
      return crawlLabel;
    }

    if (isSourceOcrProcessing(source)) {
      return "Reading scanned pages…";
    }

    return getStatusLabel(source.status);
  }

  switch (source) {
    case "pending":
      return "Queued";
    case "processing":
      return "Reading";
    case "ready":
      return "Ready";
    case "error":
      return "Could not read";
    default:
      return source;
  }
}

export function getIngestionProgressMessage(sources: Source[]): string | null {
  const active = sources.filter(
    (source) => source.status === "pending" || source.status === "processing",
  );

  if (active.length === 0) {
    return null;
  }

  const processing = active.filter((source) => source.status === "processing");
  const pending = active.filter((source) => source.status === "pending");

  if (processing.length === 1 && active.length === 1) {
    const label = isSourceOcrProcessing(processing[0]!)
      ? "Reading scanned pages"
      : "Reading";
    return `${label} “${processing[0]!.name}” — you can ask questions as soon as it’s ready.`;
  }

  if (processing.length > 0) {
    const ocrCount = processing.filter((source) =>
      isSourceOcrProcessing(source),
    ).length;

    if (ocrCount === processing.length) {
      return `Reading scanned pages from ${processing.length} document${processing.length === 1 ? "" : "s"}…`;
    }

    return `Reading ${processing.length} document${processing.length === 1 ? "" : "s"}…`;
  }

  if (pending.length === 1) {
    return `“${pending[0]!.name}” is queued — reading starts in a moment.`;
  }

  return `${pending.length} documents queued — reading starts shortly.`;
}

export function isScannedPdfError(
  sourceOrMessage: Source | string | null | undefined,
): boolean {
  if (!sourceOrMessage) {
    return false;
  }

  if (typeof sourceOrMessage === "object") {
    return getIngestionFailureDisplay(sourceOrMessage)?.isOcrUpsell ?? false;
  }

  const category = classifyIngestionError(sourceOrMessage);
  return category === "scanned_pdf" || category === "ocr_over_cap";
}

export function getIngestionErrorHint(
  sourceOrMessage: Source | string | null | undefined,
): string | null {
  if (!sourceOrMessage) {
    return null;
  }

  if (typeof sourceOrMessage === "object") {
    return getIngestionFailureDisplay(sourceOrMessage)?.recovery ?? null;
  }

  return getIngestionRecoveryAction(classifyIngestionError(sourceOrMessage));
}

