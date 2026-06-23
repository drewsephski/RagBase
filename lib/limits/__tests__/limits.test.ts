import { describe, expect, test } from "@jest/globals";
import { LIMITS } from "@/lib/domain/definitions";
import { checkFileSize, checkPdfPages } from "@/lib/limits";
import { chunkText } from "@/lib/ingestion/chunk";
import { isRootUrl } from "@/lib/ingestion/url-utils";
import { validateUpload } from "@/lib/ingestion/validate";

describe("limits", () => {
  test("allows files under 10MB", () => {
    expect(() => checkFileSize(LIMITS.MAX_FILE_BYTES)).not.toThrow();
  });

  test("rejects files over 10MB", () => {
    expect(() => checkFileSize(LIMITS.MAX_FILE_BYTES + 1)).toThrow();
  });

  test("allows PDFs under 50 pages", () => {
    expect(() => checkPdfPages(LIMITS.MAX_PDF_PAGES)).not.toThrow();
  });

  test("rejects PDFs over 50 pages", () => {
    expect(() => checkPdfPages(LIMITS.MAX_PDF_PAGES + 1)).toThrow();
  });
});

describe("chunkText", () => {
  test("returns chunks for long text", () => {
    const text = "word ".repeat(2000);
    const chunks = chunkText([{ text, pageNumber: 1 }]);
    expect(chunks.length).toBeGreaterThan(1);
  });
});

describe("isRootUrl", () => {
  test("detects root URLs", () => {
    expect(isRootUrl("https://example.com/")).toBe(true);
    expect(isRootUrl("https://example.com")).toBe(true);
  });

  test("allows article URLs", () => {
    expect(isRootUrl("https://example.com/blog/post")).toBe(false);
  });
});

describe("validateUpload", () => {
  test("accepts valid PDF", () => {
    expect(() =>
      validateUpload({
        filename: "doc.pdf",
        mimeType: "application/pdf",
        bytes: 1024,
      }),
    ).not.toThrow();
  });

  test("rejects invalid extension", () => {
    expect(() =>
      validateUpload({
        filename: "doc.exe",
        mimeType: "application/octet-stream",
        bytes: 1024,
      }),
    ).toThrow();
  });
});
