import { ocrPdfWithFirecrawl } from "@/lib/ingestion/ocr/firecrawl-ocr";
import { normalizeOcrPages } from "@/lib/ingestion/ocr/parse-pages";
import { ocrPdfWithVision } from "@/lib/ingestion/ocr/vision-ocr";
import type { OcrProvider } from "@/lib/ingestion/ocr/types";
import type { PdfPage } from "@/lib/ingestion/pdf";
import { OcrProviderError } from "@/lib/ingestion/ocr/errors";

export interface OcrExtractInput {
  buffer: Buffer;
  filename: string;
  /** Actual page count of the PDF (vision prompt + normalization). */
  pageCount: number;
  /** Tier page cap passed to Firecrawl's OCR parser. */
  maxPages: number;
  openRouterKey?: string;
}

export type OcrProviderAdapter = (input: OcrExtractInput) => Promise<PdfPage[]>;

async function firecrawlOcrAdapter(input: OcrExtractInput): Promise<PdfPage[]> {
  return ocrPdfWithFirecrawl(input.buffer, input.filename, input.maxPages);
}

async function visionOcrAdapter(input: OcrExtractInput): Promise<PdfPage[]> {
  const apiKey = input.openRouterKey?.trim();

  if (!apiKey) {
    throw new OcrProviderError("OpenRouter API key is required for larger scans.");
  }

  return ocrPdfWithVision(
    input.buffer,
    input.filename,
    input.pageCount,
    apiKey,
  );
}

const OCR_PROVIDER_ADAPTERS: Record<OcrProvider, OcrProviderAdapter> = {
  firecrawl: firecrawlOcrAdapter,
  openrouter_vision: visionOcrAdapter,
};

export function getOcrProviderAdapter(provider: OcrProvider): OcrProviderAdapter {
  return OCR_PROVIDER_ADAPTERS[provider];
}

/** Extract normalized per-page text via the selected OCR provider adapter. */
export async function extractOcrPages(
  provider: OcrProvider,
  input: OcrExtractInput,
): Promise<PdfPage[]> {
  const adapter = getOcrProviderAdapter(provider);
  const pages = await adapter(input);
  return normalizeOcrPages(pages, input.pageCount);
}
