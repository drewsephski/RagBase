import { describe, expect, test } from "@jest/globals";
import { isRootUrl } from "@/lib/ingestion/url-utils";

describe("isRootUrl", () => {
  test("returns true for homepage URLs", () => {
    expect(isRootUrl("https://example.com/")).toBe(true);
    expect(isRootUrl("https://example.com")).toBe(true);
    expect(isRootUrl("https://docs.example.com/")).toBe(true);
  });

  test("returns false for non-root paths", () => {
    expect(isRootUrl("https://example.com/pricing")).toBe(false);
    expect(isRootUrl("https://example.com/blog/post")).toBe(false);
    expect(isRootUrl("https://docs.example.com/getting-started")).toBe(false);
  });

  test("returns false when query string is present", () => {
    expect(isRootUrl("https://example.com/?ref=home")).toBe(false);
  });
});
