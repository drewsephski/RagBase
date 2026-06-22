import { describe, expect, test } from "@jest/globals";
import {
  getIngestionErrorHint,
  getIngestionProgressMessage,
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
});

describe("getIngestionErrorHint", () => {
  test("suggests alternatives for scanned PDFs", () => {
    expect(
      isScannedPdfError("This looks like a scanned PDF. OCR support is coming soon."),
    ).toBe(true);
    expect(getIngestionErrorHint("This looks like a scanned PDF.")).toMatch(/OCR/i);
  });
});
