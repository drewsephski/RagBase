export type IngestionErrorCategory =
  | "scanned_pdf"
  | "oversized_file"
  | "too_many_pages"
  | "blocked_url"
  | "unsupported_type"
  | "empty_content"
  | "service_unavailable"
  | "unknown";

export interface IngestionErrorDetails {
  category: IngestionErrorCategory;
  message: string;
  recovery: string | null;
}

const ROOT_URL_NOTICE =
  "Only this page was added. Full-site crawling is coming soon.";

export const ROOT_URL_INGESTION_NOTICE = ROOT_URL_NOTICE;

export function classifyIngestionError(message: string): IngestionErrorCategory {
  const normalized = message.toLowerCase();

  if (/scanned|image-only|ocr/i.test(normalized)) {
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

  if (/rate limit|429|too many requests|temporarily unavailable|openrouter/i.test(normalized)) {
    return "service_unavailable";
  }

  return "unknown";
}

export function getIngestionRecoveryAction(
  category: IngestionErrorCategory,
): string | null {
  switch (category) {
    case "scanned_pdf":
      return "OCR for scanned PDFs is coming soon. For now, export a text-based PDF or upload a Word or text file.";
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

export function normalizeIngestionError(message: string): IngestionErrorDetails {
  const category = classifyIngestionError(message);

  const friendlyMessages: Partial<Record<IngestionErrorCategory, string>> = {
    scanned_pdf:
      "This looks like a scanned PDF with little readable text. OCR support is coming soon.",
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

  return {
    category,
    message: friendlyMessages[category] ?? message,
    recovery: getIngestionRecoveryAction(category),
  };
}

export function normalizeIngestionErrorFromUnknown(error: unknown): string {
  if (error instanceof Error) {
    return normalizeIngestionError(error.message).message;
  }

  return normalizeIngestionError(
    "Document processing failed. Try again or upload a different file.",
  ).message;
}
