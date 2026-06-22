import { describe, expect, test } from "@jest/globals";
import {
  classifyIngestionError,
  getIngestionRecoveryAction,
  normalizeIngestionError,
} from "@/lib/ingestion/user-errors";

describe("normalizeIngestionError", () => {
  test("maps scanned PDF errors to OCR recovery guidance", () => {
    const details = normalizeIngestionError(
      "This looks like a scanned PDF. OCR support is coming soon.",
    );

    expect(details.category).toBe("scanned_pdf");
    expect(getIngestionRecoveryAction(details.category)).toMatch(/OCR/i);
  });

  test("maps rate limit errors to service recovery guidance", () => {
    expect(classifyIngestionError("OpenRouter rate limit reached")).toBe(
      "service_unavailable",
    );
  });
});
