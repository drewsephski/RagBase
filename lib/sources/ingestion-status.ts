import type { Source, SourceStatus } from "@/app/lib/definitions";
import {
  classifyIngestionError,
  getIngestionRecoveryAction,
} from "@/lib/ingestion/user-errors";

export function getStatusLabel(status: SourceStatus): string {
  switch (status) {
    case "pending":
      return "Queued";
    case "processing":
      return "Reading";
    case "ready":
      return "Ready";
    case "error":
      return "Could not read";
    default:
      return status;
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
    return `Reading “${processing[0]!.name}” — you can ask questions as soon as it’s ready.`;
  }

  if (processing.length > 0) {
    return `Reading ${processing.length} document${processing.length === 1 ? "" : "s"}…`;
  }

  if (pending.length === 1) {
    return `“${pending[0]!.name}” is queued — reading starts in a moment.`;
  }

  return `${pending.length} documents queued — reading starts shortly.`;
}

export function isScannedPdfError(message: string | null | undefined): boolean {
  if (!message) {
    return false;
  }

  return classifyIngestionError(message) === "scanned_pdf";
}

export function getIngestionErrorHint(message: string | null | undefined): string | null {
  if (!message) {
    return null;
  }

  return getIngestionRecoveryAction(classifyIngestionError(message));
}
