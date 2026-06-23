import type { IngestionErrorCategory, Source } from "@/app/lib/definitions";
import { ingestionErrorCategorySchema, parseSourceMetadata } from "@/app/lib/definitions";
import { OcrPageCapError } from "@/lib/ingestion/ocr/caps";
import { OcrProviderError } from "@/lib/ingestion/ocr/errors";
import { UrlScrapeError } from "@/lib/ingestion/url-utils";

export type { IngestionErrorCategory };

export interface IngestionErrorDetails {
  category: IngestionErrorCategory;
  message: string;
  recovery: string | null;
}

const ROOT_URL_NOTICE =
  "Only this page was added. Unlock site crawling with RagBase Pro to read the whole site.";

export const ROOT_URL_INGESTION_NOTICE = ROOT_URL_NOTICE;

export function classifyIngestionError(message: string): IngestionErrorCategory {
  const normalized = message.toLowerCase();

  if (/ocr supports up to|scanned pdf has \d+ pages|too many pages for ocr on your current tier/i.test(normalized)) {
    return "ocr_over_cap";
  }

  if (
    /vision ocr|ocr returned|scanned pdf ocr|ocr failed|ocr is not configured/i.test(
      normalized,
    )
  ) {
    return "ocr_provider_error";
  }

  if (/scanned|image-only/i.test(normalized)) {
    return "scanned_pdf";
  }

  if (/too large|maximum size|413/i.test(normalized)) {
    return "oversized_file";
  }

  if (/too many pages|maximum is \d+ pages/i.test(normalized)) {
    return "too_many_pages";
  }

  if (
    /could not fetch|not publicly accessible|sign-in|http 403|http 401|blocked/i.test(
      normalized,
    )
  ) {
    return "blocked_url";
  }

  if (/unsupported file type|unsupported mime|extension and mime/i.test(normalized)) {
    return "unsupported_type";
  }

  if (/no searchable content|does not contain any text|empty/i.test(normalized)) {
    return "empty_content";
  }

  if (/rate limit|429|too many requests|temporarily unavailable/i.test(normalized)) {
    return "service_unavailable";
  }

  return "unknown";
}

export function getIngestionRecoveryAction(
  category: IngestionErrorCategory,
): string | null {
  switch (category) {
    case "scanned_pdf":
      return "Export a text-based PDF, add your OpenRouter key in Settings for scans up to 50 pages, or split the document.";
    case "ocr_over_cap":
      return "Add your OpenRouter key in Settings to OCR scans up to 50 pages, or split the PDF into smaller parts (10 pages or fewer on the free tier).";
    case "ocr_provider_error":
      return "Check your OpenRouter key in Settings, try a text-based PDF, or tap Reindex to try again.";
    case "oversized_file":
      return "Try a smaller export, split the document, or paste a public link to the content instead.";
    case "too_many_pages":
      return "Split the PDF into smaller parts (under 50 pages each) and upload them one at a time.";
    case "blocked_url":
      return "Use a direct public link to one page, or download the page as PDF and upload it.";
    case "unsupported_type":
      return "Upload PDF, Word (.docx), plain text, or Markdown — or paste a public webpage link.";
    case "empty_content":
      return "Try a different export or format. If this is a webpage, paste the exact article URL.";
    case "service_unavailable":
      return "Wait a minute and tap Reindex, or add your own OpenRouter key in Settings for higher limits.";
    default:
      return "Remove this document and try another file or link, or tap Reindex to try again.";
  }
}

function buildIngestionErrorDetails(
  category: IngestionErrorCategory,
  message: string,
): IngestionErrorDetails {
  return {
    category,
    message,
    recovery: getIngestionRecoveryAction(category),
  };
}

export function normalizeIngestionError(message: string): IngestionErrorDetails {
  const category = classifyIngestionError(message);

  const friendlyMessages: Partial<Record<IngestionErrorCategory, string>> = {
    scanned_pdf:
      "This looks like a scanned PDF with little readable text.",
    ocr_over_cap:
      "This scanned PDF has too many pages for OCR on your current tier.",
    ocr_provider_error:
      "We couldn't read this scanned PDF with OCR. Please try again or use a different file.",
    oversized_file: "This file is too large. The maximum size is 10 MB.",
    too_many_pages: "This PDF has too many pages. The maximum is 50 pages.",
    blocked_url:
      "We couldn't read this link. It may require sign-in or block automated access.",
    unsupported_type:
      "This file type isn't supported. Use PDF, Word, text, Markdown, or paste a link.",
    empty_content: "We couldn't find readable text in this document.",
    service_unavailable:
      "We hit a temporary limit while reading this document. Please try again shortly.",
  };

  return buildIngestionErrorDetails(
    category,
    friendlyMessages[category] ?? message,
  );
}

/** Map a thrown error to a structured ingestion failure (write path). */
export function resolveIngestionFailure(error: unknown): IngestionErrorDetails {
  if (error instanceof OcrPageCapError) {
    return buildIngestionErrorDetails("ocr_over_cap", error.message);
  }

  if (error instanceof OcrProviderError) {
    return buildIngestionErrorDetails("ocr_provider_error", error.message);
  }

  if (error instanceof UrlScrapeError) {
    return normalizeIngestionError(error.message);
  }

  if (error instanceof Error && error.name === "IngestionError") {
    return normalizeIngestionError(error.message);
  }

  if (error instanceof Error) {
    return normalizeIngestionError(error.message);
  }

  return normalizeIngestionError(
    "Document processing failed. Try again or upload a different file.",
  );
}

function parseStoredErrorCategory(
  value: unknown,
): IngestionErrorCategory | null {
  const parsed = ingestionErrorCategorySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Read a persisted source failure (read path; regex fallback for legacy rows). */
export function getSourceIngestionFailure(
  source: Pick<Source, "status" | "error_message" | "metadata">,
): IngestionErrorDetails | null {
  if (source.status !== "error" || !source.error_message) {
    return null;
  }

  const metadata = parseSourceMetadata(
    source.metadata as Record<string, unknown> | null | undefined,
  );
  const storedCategory = parseStoredErrorCategory(metadata.errorCategory);

  if (storedCategory) {
    return buildIngestionErrorDetails(storedCategory, source.error_message);
  }

  return normalizeIngestionError(source.error_message);
}

export function isOcrUpsellCategory(category: IngestionErrorCategory): boolean {
  return category === "scanned_pdf" || category === "ocr_over_cap";
}
