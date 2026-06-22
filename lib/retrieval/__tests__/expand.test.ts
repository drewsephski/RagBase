import { describe, expect, test } from "@jest/globals";

import {
  dedupeChunks,
  sortChunksForContext,
  trimChunksToTokenBudget,
} from "@/lib/retrieval/expand";
import type { MatchChunkResult } from "@/lib/retrieval/search";

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

describe("dedupeChunks", () => {
  test("keeps the highest similarity score for duplicate chunk ids", () => {
    const deduped = dedupeChunks([
      makeChunk({ id: "chunk-1", similarity: 0.6 }),
      makeChunk({ id: "chunk-1", similarity: 0.9 }),
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.similarity).toBe(0.9);
  });
});

describe("sortChunksForContext", () => {
  test("orders chunks by source, document, and chunk index", () => {
    const sorted = sortChunksForContext([
      makeChunk({ id: "c3", chunk_index: 2 }),
      makeChunk({ id: "c1", chunk_index: 0 }),
      makeChunk({ id: "c2", chunk_index: 1 }),
    ]);

    expect(sorted.map((chunk) => chunk.id)).toEqual(["c1", "c2", "c3"]);
  });
});

describe("trimChunksToTokenBudget", () => {
  test("prefers higher-similarity chunks when trimming", () => {
    const trimmed = trimChunksToTokenBudget(
      [
        makeChunk({
          id: "low",
          chunk_text: "x".repeat(4000),
          similarity: 0.4,
          chunk_index: 0,
        }),
        makeChunk({
          id: "high",
          chunk_text: "Important answer context.",
          similarity: 0.95,
          chunk_index: 1,
        }),
      ],
      200,
    );

    expect(trimmed.map((chunk) => chunk.id)).toContain("high");
    expect(trimmed.map((chunk) => chunk.id)).not.toContain("low");
  });

  test("keeps at least one chunk even when it exceeds the budget", () => {
    const trimmed = trimChunksToTokenBudget(
      [makeChunk({ id: "only", chunk_text: "x".repeat(8000), similarity: 1 })],
      100,
    );

    expect(trimmed).toHaveLength(1);
    expect(trimmed[0]?.id).toBe("only");
  });
});
