import { describe, expect, test } from "@jest/globals";
import {
  getIngestionErrorHint,
  getIngestionProgressMessage,
  getStatusLabel,
  isScannedPdfError,
} from "@/lib/sources/ingestion-status";
import type { Source } from "@/app/lib/definitions";

function makeSource(overrides: Partial<Source>): Source {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    workspace_id: "00000000-0000-4000-8000-000000000002",
    type: "file",
    name: "contract.pdf",
    status: "processing",
    storage_path: null,
    metadata: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("getIngestionProgressMessage", () => {
  test("returns null when all sources are ready", () => {
    expect(
      getIngestionProgressMessage([
        makeSource({ status: "ready", name: "ready.pdf" }),
      ]),
    ).toBeNull();
  });

  test("describes a single processing document", () => {
    const message = getIngestionProgressMessage([
      makeSource({ status: "processing", name: "lease.pdf" }),
    ]);

    expect(message).toContain("lease.pdf");
    expect(message).toContain("Reading");
  });

  test("shows OCR-specific status label while scanned pages are processed", () => {
    expect(
      getStatusLabel(
        makeSource({
          status: "processing",
          metadata: { ingestionPhase: "ocr" },
        }),
      ),
    ).toBe("Reading scanned pages…");
  });
});

describe("getIngestionErrorHint", () => {
  test("suggests alternatives for scanned PDFs and OCR caps via stored category", () => {
    const source = makeSource({
      status: "error",
      error_message:
        "This scanned PDF has too many pages for OCR on your current tier.",
      metadata: { errorCategory: "ocr_over_cap" },
    });

    expect(isScannedPdfError(source)).toBe(true);
    expect(getIngestionErrorHint(source)).toMatch(/10 pages or fewer/i);
  });

  test("suggests alternatives for scanned PDFs and OCR caps via legacy message", () => {
    expect(
      isScannedPdfError("This looks like a scanned PDF with little readable text."),
    ).toBe(true);
    expect(
      isScannedPdfError(
        "This scanned PDF has 15 pages. OCR supports up to 10 pages on the free tier.",
      ),
    ).toBe(true);
    expect(
      getIngestionErrorHint(
        "This scanned PDF has 15 pages. OCR supports up to 10 pages on the free tier.",
      ),
    ).toMatch(/10 pages or fewer/i);
    expect(
      getIngestionErrorHint(
        "Vision OCR failed (401). Check your OpenRouter key and try again.",
      ),
    ).toMatch(/OpenRouter key/i);
  });
});
