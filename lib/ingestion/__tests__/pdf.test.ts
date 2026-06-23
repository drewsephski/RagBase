import { describe, expect, test } from "@jest/globals";
import { LIMITS } from "@/app/lib/definitions";
import { detectLowTextPdf } from "@/lib/ingestion/pdf";

describe("detectLowTextPdf", () => {
  test("detects scanned pages with little extractable text", () => {
    expect(
      detectLowTextPdf([
        { pageNumber: 1, text: "a" },
        { pageNumber: 2, text: "bb" },
      ]),
    ).toBe(true);
  });

  test("accepts PDFs with enough text per page", () => {
    const denseText = "word ".repeat(Math.ceil(LIMITS.LOW_TEXT_CHARS_PER_PAGE / 2));

    expect(detectLowTextPdf([{ pageNumber: 1, text: denseText }])).toBe(false);
  });

  test("treats empty page list as low text", () => {
    expect(detectLowTextPdf([])).toBe(true);
  });
});
