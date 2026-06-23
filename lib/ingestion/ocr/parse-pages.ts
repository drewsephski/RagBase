import type { PdfPage } from "@/lib/ingestion/pdf";

const PAGE_MARKER_PATTERN = /^PAGE\s+(\d+)\s*:\s*$/im;

export function parseOcrPagesFromText(
  responseText: string,
  expectedPageCount: number,
): PdfPage[] {
  const lines = responseText.replace(/\r\n/g, "\n").split("\n");
  const pages: PdfPage[] = [];
  let currentPageNumber: number | null = null;
  let currentLines: string[] = [];

  function flushPage(): void {
    if (currentPageNumber === null) {
      return;
    }

    pages.push({
      pageNumber: currentPageNumber,
      text: currentLines.join("\n").trim(),
    });
    currentLines = [];
  }

  for (const line of lines) {
    const markerMatch = line.match(PAGE_MARKER_PATTERN);

    if (markerMatch) {
      flushPage();
      currentPageNumber = Number.parseInt(markerMatch[1] ?? "0", 10);
      continue;
    }

    if (currentPageNumber !== null) {
      currentLines.push(line);
    }
  }

  flushPage();

  if (pages.length > 0) {
    return pages.slice(0, expectedPageCount);
  }

  const fallbackText = responseText.trim();

  if (fallbackText.length === 0) {
    return [];
  }

  return [{ pageNumber: 1, text: fallbackText }];
}

/** Sort, trim, and cap OCR output to the document page count. */
export function normalizeOcrPages(
  pages: PdfPage[],
  pageCount: number,
): PdfPage[] {
  return [...pages]
    .sort((left, right) => left.pageNumber - right.pageNumber)
    .slice(0, pageCount);
}
