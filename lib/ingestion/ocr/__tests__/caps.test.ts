import { describe, expect, test } from "@jest/globals";
import { LIMITS } from "@/app/lib/definitions";
import {
  enforceOcrPageCap,
  getOcrPageCap,
  OcrPageCapError,
  prepareOcrRun,
  resolveOcrTier,
  selectOcrProvider,
} from "@/lib/ingestion/ocr/caps";

describe("OCR caps", () => {
  test("free tier allows up to 10 pages", () => {
    expect(getOcrPageCap("free")).toBe(LIMITS.OCR_PAGES_FREE);
    expect(() => enforceOcrPageCap(10, "free")).not.toThrow();
  });

  test("BYOK tier allows up to 50 pages", () => {
    expect(getOcrPageCap("byok")).toBe(LIMITS.OCR_PAGES_BYOK);
    expect(() => enforceOcrPageCap(50, "byok")).not.toThrow();
  });

  test("rejects free tier scans over cap before provider usage", () => {
    expect(() => enforceOcrPageCap(11, "free")).toThrow(OcrPageCapError);

    try {
      enforceOcrPageCap(11, "free");
    } catch (error) {
      expect(error).toBeInstanceOf(OcrPageCapError);
      expect((error as OcrPageCapError).cap).toBe(10);
      expect((error as OcrPageCapError).tier).toBe("free");
    }
  });

  test("selects vision OCR for BYOK and Firecrawl for free tier", () => {
    expect(resolveOcrTier(false)).toBe("free");
    expect(resolveOcrTier(true)).toBe("byok");
    expect(selectOcrProvider("free")).toBe("firecrawl");
    expect(selectOcrProvider("byok")).toBe("openrouter_vision");
  });

  test("prepareOcrRun rejects free over-cap before provider selection is used", () => {
    expect(() => prepareOcrRun(11)).toThrow(OcrPageCapError);
  });

  test("prepareOcrRun selects vision OCR for BYOK under cap", () => {
    expect(prepareOcrRun(12, "sk-or-test")).toEqual({
      tier: "byok",
      provider: "openrouter_vision",
      openRouterKey: "sk-or-test",
    });
  });

  test("prepareOcrRun selects Firecrawl for free tier under cap", () => {
    expect(prepareOcrRun(8)).toEqual({
      tier: "free",
      provider: "firecrawl",
    });
  });
});
