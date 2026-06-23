import { getFirecrawlClient } from "@/lib/ingestion/firecrawl-client";
import { OcrProviderError } from "@/lib/ingestion/ocr/errors";
import { parseOcrPagesFromText } from "@/lib/ingestion/ocr/parse-pages";
import type { PdfPage } from "@/lib/ingestion/pdf";

export async function ocrPdfWithFirecrawl(
  buffer: Buffer,
  filename: string,
  maxPages: number,
): Promise<PdfPage[]> {
  const firecrawl = getFirecrawlClient();

  try {
    const result = await firecrawl.parse(
      {
        data: buffer,
        filename,
        contentType: "application/pdf",
      },
      {
        formats: ["markdown"],
        parsers: [{ type: "pdf", mode: "ocr", maxPages }],
      },
    );

    const markdown = result.markdown?.trim() ?? "";

    if (markdown.length === 0) {
      throw new OcrProviderError("OCR returned no readable text from this scan.");
    }

    const pages = parseOcrPagesFromText(markdown, maxPages);

    if (pages.length === 0 || pages.every((page) => page.text.length === 0)) {
      throw new OcrProviderError("OCR returned no readable text from this scan.");
    }

    return pages;
  } catch (error) {
    if (error instanceof OcrProviderError) {
      throw error;
    }

    if (error instanceof Error && error.message.includes("FIRECRAWL_API_KEY")) {
      throw new OcrProviderError(
        "Scanned PDF OCR is not configured on the server. Try a text-based PDF or add your OpenRouter key in Settings.",
      );
    }

    const message =
      error instanceof Error ? error.message : "Scanned PDF OCR failed.";

    throw new OcrProviderError(message);
  }
}
