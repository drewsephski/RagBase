import { describe, expect, test } from "@jest/globals";
import {
  linkifyCitationMarkers,
  parseCitationLinkHref,
} from "@/lib/chat/citations/display";

describe("linkifyCitationMarkers", () => {
  test("converts inline citation markers to markdown links", () => {
    expect(linkifyCitationMarkers("Claim [1] and [2] here.")).toBe(
      "Claim [1](#cite-1) and [2](#cite-2) here.",
    );
  });

  test("leaves non-citation brackets unchanged", () => {
    expect(linkifyCitationMarkers("[note] and [12abc] stay.")).toBe(
      "[note] and [12abc] stay.",
    );
  });
});

describe("parseCitationLinkHref", () => {
  test("returns citation ref for cite links", () => {
    expect(parseCitationLinkHref("#cite-3")).toBe(3);
  });

  test("returns null for other links", () => {
    expect(parseCitationLinkHref("https://example.com")).toBeNull();
    expect(parseCitationLinkHref(undefined)).toBeNull();
  });
});
