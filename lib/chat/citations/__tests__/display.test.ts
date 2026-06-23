import { describe, expect, test } from "@jest/globals";
import {
  linkifyCitationMarkers,
  parseCitationLinkHref,
} from "@/lib/chat/citations/display";

describe("linkifyCitationMarkers", () => {
  test("linkifies a single citation marker", () => {
    expect(linkifyCitationMarkers("Answer [1] here.")).toBe(
      "Answer [1](#cite-1) here.",
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
});

describe("parseCitationLinkHref", () => {
  test("parses citation href", () => {
    expect(parseCitationLinkHref("#cite-6")).toBe(6);
  });

  test("returns null for non-citation hrefs", () => {
    expect(parseCitationLinkHref("https://example.com")).toBeNull();
  });
});
