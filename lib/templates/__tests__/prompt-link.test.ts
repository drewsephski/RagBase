import { describe, expect, test } from "@jest/globals";
import {
  buildAbsolutePromptAppUrl,
  buildPromptAppUrl,
  MAX_SHAREABLE_PROMPT_LENGTH,
  parsePromptUrlParam,
  PROMPT_URL_PARAM,
} from "@/lib/templates/prompt-link";

describe("parsePromptUrlParam", () => {
  test("decodes and normalizes whitespace", () => {
    expect(parsePromptUrlParam("What%20metrics%20were%20tracked%3F")).toBe(
      "What metrics were tracked?",
    );
    expect(parsePromptUrlParam("  Summarize   this  ")).toBe("Summarize this");
  });

  test("rejects empty, invalid, or oversized prompts", () => {
    expect(parsePromptUrlParam("")).toBeNull();
    expect(parsePromptUrlParam("   ")).toBeNull();
    expect(parsePromptUrlParam(null)).toBeNull();
    expect(parsePromptUrlParam("%E0%A4%A")).toBeNull();
    expect(parsePromptUrlParam("x".repeat(MAX_SHAREABLE_PROMPT_LENGTH + 1))).toBeNull();
  });
});

describe("buildPromptAppUrl", () => {
  test("builds app links with optional template", () => {
    expect(buildPromptAppUrl("Summarize this document")).toBe(
      `/app?${PROMPT_URL_PARAM}=Summarize+this+document`,
    );

    expect(
      buildPromptAppUrl("What metrics were tracked?", {
        templateId: "hospital-qi",
      }),
    ).toBe(
      `/app?template=hospital-qi&${PROMPT_URL_PARAM}=What+metrics+were+tracked%3F`,
    );
  });

  test("returns null for invalid prompts", () => {
    expect(buildPromptAppUrl("")).toBeNull();
    expect(buildPromptAppUrl(" ".repeat(10))).toBeNull();
  });
});

describe("buildAbsolutePromptAppUrl", () => {
  test("prefixes origin when provided", () => {
    expect(
      buildAbsolutePromptAppUrl("Summarize this", {
        origin: "https://ragbase.dev",
      }),
    ).toBe(`https://ragbase.dev/app?${PROMPT_URL_PARAM}=Summarize+this`);
  });
});
