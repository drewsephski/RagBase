import { describe, expect, test } from "@jest/globals";
import type { ParsedPdf } from "@/lib/ingestion/pdf";
import { ingestPdfBuffer } from "@/lib/ingestion/pdf-ingestion";

function makeProbe(overrides: Partial<ParsedPdf> = {}): ParsedPdf {
  return {
    pages: [{ pageNumber: 1, text: "Hello world" }],
    pageCount: 1,
    rawText: "Hello world",
    isLowText: false,
    ...overrides,
  };
}

describe("ingestPdfBuffer", () => {
  test("returns embedded text without OCR for text-based PDFs", async () => {
    const outcome = await ingestPdfBuffer(Buffer.from("pdf"), "lease.pdf", {
      probe: makeProbe(),
    });

    expect(outcome.rawText).toBe("Hello world");
    expect(outcome.segments[0]?.pageNumber).toBe(1);
  });
});
