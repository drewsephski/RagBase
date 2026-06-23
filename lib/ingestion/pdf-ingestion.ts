import type { TextSegment } from "@/lib/ingestion/chunk";
import { runPdfOcr } from "@/lib/ingestion/ocr/run";
import {
  parsePdf,
  pdfPagesToSegments,
  type ParsedPdf,
} from "@/lib/ingestion/pdf";

export type { ParsedPdf };

export interface PdfIngestionOptions {
  openRouterKey?: string;
  /** Reuse a probe from an earlier parse of the same buffer. */
  probe?: ParsedPdf;
}

export interface PdfIngestionOutcome {
  rawText: string;
  pageCount: number;
  segments: TextSegment[];
}

export async function ingestPdfBuffer(
  buffer: Buffer,
  filename: string,
  options: PdfIngestionOptions = {},
): Promise<PdfIngestionOutcome> {
  const probe = options.probe ?? (await parsePdf(buffer));

  if (probe.isLowText) {
    const ocrResult = await runPdfOcr({
      buffer,
      filename,
      pageCount: probe.pageCount,
      openRouterKey: options.openRouterKey,
    });

    const rawText = ocrResult.pages
      .map((page) => page.text)
      .filter((text) => text.length > 0)
      .join("\n\n");

    return {
      rawText,
      pageCount: probe.pageCount,
      segments: pdfPagesToSegments(ocrResult.pages),
    };
  }

  return {
    rawText: probe.rawText,
    pageCount: probe.pageCount,
    segments: pdfPagesToSegments(probe.pages),
  };
}
