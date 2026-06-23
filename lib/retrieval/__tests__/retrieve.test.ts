import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { RETRIEVAL } from "@/lib/retrieval/config";
import type { MatchChunkResult, SearchChunksOptions } from "@/lib/retrieval/types";

jest.mock("@/lib/retrieval/backend", () => ({
  createSupabaseSearchBackend: jest.fn(),
}));

import { retrieveForChat } from "@/lib/retrieval/retrieve";

interface TestSearchBackend {
  searchChunks(options: SearchChunksOptions): Promise<MatchChunkResult[]>;
  countSourceChunks(sourceId: string): Promise<number>;
  fetchSourceChunksOrdered(
    workspaceId: string,
    sourceId: string,
  ): Promise<MatchChunkResult[]>;
  fetchAdjacentChunks(
    seeds: MatchChunkResult[],
    radius: number,
  ): Promise<MatchChunkResult[]>;
}

function makeChunk(
  overrides: Partial<MatchChunkResult> & Pick<MatchChunkResult, "id">,
): MatchChunkResult {
  return {
    chunk_text: "Retrieved chunk text.",
    page_number: null,
    source_location: null,
    source_id: "source-1",
    source_name: "Doc A",
    document_id: "doc-1",
    chunk_index: 0,
    similarity: 0.9,
    ...overrides,
  };
}

describe("retrieveForChat", () => {
  const searchChunks = jest.fn<TestSearchBackend["searchChunks"]>();
  const countSourceChunks = jest.fn<TestSearchBackend["countSourceChunks"]>();
  const fetchSourceChunksOrdered =
    jest.fn<TestSearchBackend["fetchSourceChunksOrdered"]>();
  const fetchAdjacentChunks = jest.fn<TestSearchBackend["fetchAdjacentChunks"]>();

  const backend = {
    searchChunks,
    countSourceChunks,
    fetchSourceChunksOrdered,
    fetchAdjacentChunks,
  } satisfies TestSearchBackend;

  beforeEach(() => {
    jest.clearAllMocks();
    searchChunks.mockResolvedValue([
      makeChunk({ id: "seed-1", source_id: "source-1" }),
      makeChunk({ id: "seed-2", source_id: "source-2", chunk_index: 1 }),
    ]);
    countSourceChunks.mockImplementation(async (sourceId) =>
      sourceId === "source-2" ? 4 : 20,
    );
    fetchAdjacentChunks.mockResolvedValue([
      makeChunk({ id: "adjacent-1", similarity: 0.5, chunk_index: 1 }),
    ]);
    fetchSourceChunksOrdered.mockImplementation(async (_workspaceId, sourceId) => [
      makeChunk({ id: `${sourceId}-full`, similarity: 1 }),
    ]);
  });

  test("loads a scoped small source without vector search", async () => {
    countSourceChunks.mockResolvedValue(3);
    fetchSourceChunksOrdered.mockResolvedValue([
      makeChunk({ id: "scoped-full", source_id: "source-scoped" }),
    ]);

    const chunks = await retrieveForChat(
      {
        query: "policy",
        workspaceId: "workspace-1",
        sourceId: "source-scoped",
      },
      backend,
    );

    expect(searchChunks).not.toHaveBeenCalled();
    expect(fetchSourceChunksOrdered).toHaveBeenCalledWith(
      "workspace-1",
      "source-scoped",
    );
    expect(chunks.map((chunk) => chunk.id)).toEqual(["scoped-full"]);
  });

  test("expands only small seed sources and caches chunk counts per request", async () => {
    const chunks = await retrieveForChat(
      {
        query: "policy",
        workspaceId: "workspace-1",
      },
      backend,
    );

    expect(searchChunks).toHaveBeenCalledWith(
      expect.objectContaining({
        matchCount: RETRIEVAL.INITIAL_MATCH_COUNT,
      }),
    );
    expect(countSourceChunks).toHaveBeenCalledTimes(2);
    expect(fetchSourceChunksOrdered).toHaveBeenCalledWith(
      "workspace-1",
      "source-2",
    );
    expect(chunks.map((chunk) => chunk.id)).toEqual(
      expect.arrayContaining(["seed-1", "seed-2", "adjacent-1", "source-2-full"]),
    );
  });
});
