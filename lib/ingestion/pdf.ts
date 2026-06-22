import pdfParse from "pdf-parse";

import { LIMITS } from "@/app/lib/definitions";
import { checkPdfPages } from "@/lib/limits";

export interface PdfPage {
  pageNumber: number;
  text: string;
}

export interface ParsedPdf {
  pages: PdfPage[];
  pageCount: number;
  rawText: string;
  isLowText: boolean;
}

export class ScannedPdfError extends Error {
  constructor(
    message = "This looks like a scanned PDF. OCR support is coming soon — try a text-based PDF or Word file instead.",
  ) {
    super(message);
    this.name = "ScannedPdfError";
  }
}

interface PdfTextItem {
  str: string;
}

interface PdfTextContent {
  items: PdfTextItem[];
}

interface PdfPageData {
  pageIndex: number;
  getTextContent: () => Promise<PdfTextContent>;
}

export function detectLowTextPdf(pages: PdfPage[]): boolean {
  if (pages.length === 0) {
    return true;
  }

  const totalChars = pages.reduce((sum, page) => sum + page.text.trim().length, 0);
  const averageCharsPerPage = totalChars / pages.length;

  return averageCharsPerPage < LIMITS.LOW_TEXT_CHARS_PER_PAGE;
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  const pages: PdfPage[] = [];

  const options: pdfParse.Options = {
    pagerender: (pageData: PdfPageData) => {
      const pageNumber = pageData.pageIndex + 1;

      return pageData.getTextContent().then((textContent) => {
        const text = textContent.items
          .map((item) => item.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        pages.push({ pageNumber, text });
        return text;
      });
    },
  };

  const result = await pdfParse(buffer, options);
  checkPdfPages(result.numpages);

  pages.sort((left, right) => left.pageNumber - right.pageNumber);

  const isLowText = detectLowTextPdf(pages);
  if (isLowText) {
    throw new ScannedPdfError();
  }

  const rawText = pages
    .map((page) => page.text)
    .filter((text) => text.length > 0)
    .join("\n\n");

  return {
    pages,
    pageCount: result.numpages,
    rawText,
    isLowText: false,
  };
}

export function pdfPagesToSegments(pages: PdfPage[]) {
  return pages.map((page) => ({
    text: page.text,
    pageNumber: page.pageNumber,
    sourceLocation: `page ${page.pageNumber}`,
  }));
}
