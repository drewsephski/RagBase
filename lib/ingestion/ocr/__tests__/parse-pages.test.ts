import { describe, expect, test } from "@jest/globals";
import { parseOcrPagesFromText, normalizeOcrPages } from "@/lib/ingestion/ocr/parse-pages";

describe("parseOcrPagesFromText", () => {
  test("parses page markers from OCR output", () => {
    const pages = parseOcrPagesFromText(
      "PAGE 1:\nFirst page\n\nPAGE 2:\nSecond page",
      2,
    );

    expect(pages).toEqual([
      { pageNumber: 1, text: "First page" },
      { pageNumber: 2, text: "Second page" },
    ]);
  });

  test("falls back to a single page when markers are absent", () => {
    expect(parseOcrPagesFromText("All text on one page", 3)).toEqual([
      { pageNumber: 1, text: "All text on one page" },
    ]);
  });
});

describe("normalizeOcrPages", () => {
  test("sorts and caps pages to the document page count", () => {
    expect(
      normalizeOcrPages(
        [
          { pageNumber: 3, text: "Third" },
          { pageNumber: 1, text: "First" },
          { pageNumber: 2, text: "Second" },
          { pageNumber: 4, text: "Extra" },
        ],
        3,
      ),
    ).toEqual([
      { pageNumber: 1, text: "First" },
      { pageNumber: 2, text: "Second" },
      { pageNumber: 3, text: "Third" },
    ]);
  });
});
