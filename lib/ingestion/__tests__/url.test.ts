import { describe, expect, test } from "@jest/globals";
import { parseScrapeResult } from "@/lib/ingestion/url";
import { isRootUrl, normalizeUrl } from "@/lib/ingestion/url-utils";

describe("normalizeUrl", () => {
  test("adds https when protocol is missing", () => {
    expect(normalizeUrl("example.com/blog/post")).toBe(
      "https://example.com/blog/post",
    );
  });

  test("preserves existing https URLs", () => {
    expect(normalizeUrl("https://example.com/blog/post")).toBe(
      "https://example.com/blog/post",
    );
  });

  test("rejects unsupported protocols", () => {
    expect(() => normalizeUrl("ftp://example.com/file")).toThrow();
  });
});

describe("isRootUrl", () => {
  test("detects root URLs", () => {
    expect(isRootUrl("https://example.com/")).toBe(true);
    expect(isRootUrl("example.com")).toBe(true);
  });

  test("allows article URLs", () => {
    expect(isRootUrl("https://example.com/blog/post")).toBe(false);
    expect(isRootUrl("example.com/blog/post")).toBe(false);
  });
});

describe("parseScrapeResult", () => {
  test("accepts homepage scrape content", () => {
    const result = parseScrapeResult("https://example.com/", {
      markdown: "# Welcome to Example",
      metadata: {
        title: "Example Domain",
        sourceURL: "https://example.com/",
      },
    });

    expect(result.title).toBe("Example Domain");
    expect(result.url).toBe("https://example.com/");
  });

  test("extracts markdown and metadata title", () => {
    const result = parseScrapeResult("https://example.com/article", {
      markdown: "# Hello world",
      metadata: {
        title: "Example Article",
        sourceURL: "https://example.com/article",
      },
    });

    expect(result).toEqual({
      url: "https://example.com/article",
      title: "Example Article",
      markdown: "# Hello world",
    });
  });

  test("throws when markdown is empty", () => {
    expect(() =>
      parseScrapeResult("https://example.com/missing", {
        markdown: "   ",
        metadata: { statusCode: 404, error: "Not Found" },
      }),
    ).toThrow("That page could not be found");
  });
});
