import { describe, expect, test } from "@jest/globals";
import { getOcrProviderAdapter } from "@/lib/ingestion/ocr/providers";

describe("getOcrProviderAdapter", () => {
  test("returns distinct adapters for each provider", () => {
    const firecrawl = getOcrProviderAdapter("firecrawl");
    const vision = getOcrProviderAdapter("openrouter_vision");

    expect(firecrawl).not.toBe(vision);
    expect(typeof firecrawl).toBe("function");
    expect(typeof vision).toBe("function");
  });
});
