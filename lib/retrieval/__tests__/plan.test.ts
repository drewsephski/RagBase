import { describe, expect, test } from "@jest/globals";
import {
  finalizeRetrievalChunks,
  getSmallSourceIds,
  isSmallSource,
  mergeRetrievalChunks,
} from "@/lib/retrieval/plan";
import type { MatchChunkResult } from "@/lib/retrieval/types";

function makeChunk(
  overrides: Partial<MatchChunkResult> & Pick<MatchChunkResult, "id">,
): MatchChunkResult {
  return {
    chunk_text: "Sample chunk text.",
    page_number: null,
    source_location: null,
    source_id: "source-1",
    source_name: "Doc A",
    document_id: "doc-1",
    chunk_index: 0,
    similarity: 0.8,
    ...overrides,
  };
}

describe("isSmallSource", () => {
  test("treats sources within the small-doc threshold as small", () => {
    expect(isSmallSource(1, 10)).toBe(true);
    expect(isSmallSource(10, 10)).toBe(true);
  });

  test("rejects empty or oversized sources", () => {
    expect(isSmallSource(0, 10)).toBe(false);
    expect(isSmallSource(11, 10)).toBe(false);
  });
});

describe("getSmallSourceIds", () => {
  test("returns only sources within the small-doc threshold", () => {
    const counts = new Map([
      ["small-a", 3],
      ["small-b", 10],
      ["large", 42],
      ["empty", 0],
    ]);

    expect(getSmallSourceIds(["small-a", "small-b", "large", "empty"], counts, 10)).toEqual([
      "small-a",
      "small-b",
    ]);
  });
});

describe("mergeRetrievalChunks", () => {
  test("dedupes overlapping vector, adjacent, and full-source chunks", () => {
    const merged = mergeRetrievalChunks(
      [makeChunk({ id: "seed", similarity: 0.95 })],
      [makeChunk({ id: "seed", similarity: 0.5 }), makeChunk({ id: "neighbor", similarity: 0.5 })],
      [makeChunk({ id: "full-doc", source_id: "source-2", similarity: 1 })],
    );

    expect(merged.map((chunk) => chunk.id).sort()).toEqual([
      "full-doc",
      "neighbor",
      "seed",
    ]);
    expect(merged.find((chunk) => chunk.id === "seed")?.similarity).toBe(0.95);
  });
});

describe("finalizeRetrievalChunks", () => {
  test("trims merged results to the token budget", () => {
    const finalized = finalizeRetrievalChunks(
      [
        makeChunk({
          id: "low",
          chunk_text: "x".repeat(4000),
          similarity: 0.4,
        }),
        makeChunk({
          id: "high",
          chunk_text: "Important answer context.",
          similarity: 0.95,
        }),
      ],
      200,
    );

    expect(finalized.map((chunk) => chunk.id)).toContain("high");
    expect(finalized.map((chunk) => chunk.id)).not.toContain("low");
  });
});
