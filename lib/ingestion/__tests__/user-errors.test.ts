import { describe, expect, test } from "@jest/globals";
import { OcrPageCapError } from "@/lib/ingestion/ocr/caps";
import { OcrProviderError } from "@/lib/ingestion/ocr/errors";
import {
  classifyIngestionError,
  getIngestionRecoveryAction,
  getSourceIngestionFailure,
  normalizeIngestionError,
  resolveIngestionFailure,
} from "@/lib/ingestion/user-errors";
import type { Source } from "@/lib/domain/definitions";

function makeSource(overrides: Partial<Source>): Source {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    workspace_id: "00000000-0000-4000-8000-000000000002",
    type: "file",
    name: "contract.pdf",
    status: "error",
    storage_path: null,
    metadata: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("resolveIngestionFailure", () => {
  test("maps OcrPageCapError to ocr_over_cap without regex", () => {
    const error = new OcrPageCapError(15, 10, "free");
    const failure = resolveIngestionFailure(error);

    expect(failure.category).toBe("ocr_over_cap");
    expect(failure.message).toContain("15 pages");
    expect(failure.recovery).toMatch(/OpenRouter key/i);
  });

  test("maps OcrProviderError to ocr_provider_error without regex", () => {
    const failure = resolveIngestionFailure(
      new OcrProviderError("Vision OCR failed (401). Check your OpenRouter key."),
    );

    expect(failure.category).toBe("ocr_provider_error");
    expect(failure.recovery).toMatch(/OpenRouter key/i);
  });
});

describe("getSourceIngestionFailure", () => {
  test("reads stored errorCategory from metadata", () => {
    const failure = getSourceIngestionFailure(
      makeSource({
        error_message: "This scanned PDF has too many pages for OCR on your current tier.",
        metadata: { errorCategory: "ocr_over_cap" },
      }),
    );

    expect(failure?.category).toBe("ocr_over_cap");
    expect(failure?.recovery).toMatch(/10 pages or fewer/i);
  });

  test("falls back to regex for legacy sources without errorCategory", () => {
    const failure = getSourceIngestionFailure(
      makeSource({
        error_message:
          "This scanned PDF has 15 pages. OCR supports up to 10 pages on the free tier.",
        metadata: null,
      }),
    );

    expect(failure?.category).toBe("ocr_over_cap");
  });
});

describe("normalizeIngestionError", () => {
  test("maps scanned PDF errors to actionable OCR recovery guidance", () => {
    const details = normalizeIngestionError(
      "This looks like a scanned PDF with little readable text.",
    );

    expect(details.category).toBe("scanned_pdf");
    expect(getIngestionRecoveryAction(details.category)).toMatch(/OpenRouter key/i);
  });

  test("maps OCR over-cap errors to tier guidance", () => {
    const details = normalizeIngestionError(
      "This scanned PDF has 15 pages. OCR supports up to 10 pages on the free tier.",
    );

    expect(details.category).toBe("ocr_over_cap");
    expect(getIngestionRecoveryAction(details.category)).toMatch(/50 pages/i);
  });

  test("classifies persisted OCR over-cap copy for recovery hints", () => {
    const details = normalizeIngestionError(
      "This scanned PDF has too many pages for OCR on your current tier.",
    );

    expect(details.category).toBe("ocr_over_cap");
    expect(getIngestionRecoveryAction(details.category)).toMatch(/10 pages or fewer/i);
  });

  test("maps OCR provider errors before generic OpenRouter service errors", () => {
    expect(
      classifyIngestionError(
        "Vision OCR failed (401). Check your OpenRouter key and try again.",
      ),
    ).toBe("ocr_provider_error");

    expect(
      classifyIngestionError(
        "Scanned PDF OCR is not configured on the server. Try a text-based PDF or add your OpenRouter key in Settings.",
      ),
    ).toBe("ocr_provider_error");
  });

  test("maps rate limit errors to service recovery guidance", () => {
    expect(classifyIngestionError("OpenRouter rate limit reached")).toBe(
      "service_unavailable",
    );
  });
});
