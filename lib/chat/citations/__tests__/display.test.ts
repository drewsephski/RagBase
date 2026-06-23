import { describe, expect, test } from "@jest/globals";
import {
  extractCitationRefs,
  linkifyCitationMarkers,
  parseCitationLinkHref,
} from "@/lib/chat/citations/display";

describe("linkifyCitationMarkers", () => {
  test("linkifies a single citation marker", () => {
    expect(linkifyCitationMarkers("Answer [1] here.")).toBe(
      "Answer [1](#cite-1) here.",
    );
  });

  test("linkifies spaced citation markers", () => {
    expect(linkifyCitationMarkers("Answer [ 3 ] here.")).toBe(
      "Answer [3](#cite-3) here.",
    );
  });

  test("linkifies comma-separated citation markers", () => {
    expect(linkifyCitationMarkers("Answer [1, 6] here.")).toBe(
      "Answer [1](#cite-1), [6](#cite-6) here.",
    );
  });

  test("linkifies multiple citation markers in one answer", () => {
    expect(linkifyCitationMarkers("First [1] and second [2, 3].")).toBe(
      "First [1](#cite-1) and second [2](#cite-2), [3](#cite-3).",
    );
  });

  test("does not linkify markers inside inline code", () => {
    expect(linkifyCitationMarkers("Use `[3]` literally.")).toBe(
      "Use `[3]` literally.",
    );
  });

  test("does not linkify markers inside fenced code blocks", () => {
    expect(
      linkifyCitationMarkers("```json\n{\"ref\":[3]}\n```\nSee [1]."),
    ).toBe("```json\n{\"ref\":[3]}\n```\nSee [1](#cite-1).");
  });

  test("does not double-linkify existing citation links", () => {
    expect(linkifyCitationMarkers("Answer [1](#cite-1) here.")).toBe(
      "Answer [1](#cite-1) here.",
    );
  });
});

describe("extractCitationRefs", () => {
  test("collects unique refs from inline markers", () => {
    expect(extractCitationRefs("First [1] and [2, 3].")).toEqual([1, 2, 3]);
  });

  test("ignores refs inside code spans", () => {
    expect(extractCitationRefs("Literal `[3]` and real [1].")).toEqual([1]);
  });
});

describe("parseCitationLinkHref", () => {
  test("parses citation href", () => {
    expect(parseCitationLinkHref("#cite-6")).toBe(6);
  });

  test("returns null for non-citation hrefs", () => {
    expect(parseCitationLinkHref("https://example.com")).toBeNull();
  });
});
