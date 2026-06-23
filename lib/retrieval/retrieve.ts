import {
  createSupabaseSearchBackend,
  type MatchChunkResult,
  type SearchBackend,
  type SearchChunksOptions,
} from "@/lib/retrieval/backend";
import { RETRIEVAL } from "@/lib/retrieval/config";
import { uniqueSourceIds } from "@/lib/retrieval/expand";
import {
  finalizeRetrievalChunks,
  getSmallSourceIds,
  isSmallSource,
  mergeRetrievalChunks,
} from "@/lib/retrieval/plan";

function createCachedChunkCounter(backend: SearchBackend) {
  const cache = new Map<string, number>();

  return async (sourceId: string): Promise<number> => {
    const cached = cache.get(sourceId);

    if (cached !== undefined) {
      return cached;
    }

    const count = await backend.countSourceChunks(sourceId);
    cache.set(sourceId, count);
    return count;
  };
}

async function loadSmallSources(
  workspaceId: string,
  sourceIds: string[],
  backend: SearchBackend,
): Promise<MatchChunkResult[]> {
  const chunks: MatchChunkResult[] = [];

  for (const sourceId of sourceIds) {
    const sourceChunks = await backend.fetchSourceChunksOrdered(
      workspaceId,
      sourceId,
    );
    chunks.push(...sourceChunks);
  }

  return chunks;
}

export async function retrieveForChat(
  options: SearchChunksOptions,
  backend: SearchBackend = createSupabaseSearchBackend(),
): Promise<MatchChunkResult[]> {
  const { workspaceId, sourceId = null, documentId = null } = options;
  const getChunkCount = createCachedChunkCounter(backend);

  if (documentId) {
    const initialMatches = await backend.searchChunks({
      ...options,
      matchCount: options.matchCount ?? RETRIEVAL.INITIAL_MATCH_COUNT,
    });

    return finalizeRetrievalChunks(
      initialMatches,
      RETRIEVAL.MAX_CONTEXT_TOKENS,
    );
  }

  if (sourceId) {
    const scopedChunkCount = await getChunkCount(sourceId);

    if (isSmallSource(scopedChunkCount, RETRIEVAL.SMALL_DOC_MAX_CHUNKS)) {
      const scopedChunks = await backend.fetchSourceChunksOrdered(
        workspaceId,
        sourceId,
      );

      return finalizeRetrievalChunks(
        scopedChunks,
        RETRIEVAL.MAX_CONTEXT_TOKENS,
      );
    }
  }

  const initialMatches = await backend.searchChunks({
    ...options,
    matchCount: options.matchCount ?? RETRIEVAL.INITIAL_MATCH_COUNT,
  });

  const adjacentMatches = await backend.fetchAdjacentChunks(
    initialMatches,
    RETRIEVAL.ADJACENT_CHUNK_RADIUS,
  );

  const seedSourceIds = uniqueSourceIds(initialMatches);
  const chunkCountBySourceId = new Map<string, number>();

  for (const seedSourceId of seedSourceIds) {
    chunkCountBySourceId.set(
      seedSourceId,
      await getChunkCount(seedSourceId),
    );
  }

  const smallSourceIds = getSmallSourceIds(
    seedSourceIds,
    chunkCountBySourceId,
    RETRIEVAL.SMALL_DOC_MAX_CHUNKS,
  );

  const smallSourceChunks = await loadSmallSources(
    workspaceId,
    smallSourceIds,
    backend,
  );

  const merged = mergeRetrievalChunks(
    initialMatches,
    adjacentMatches,
    smallSourceChunks,
  );

  return finalizeRetrievalChunks(merged, RETRIEVAL.MAX_CONTEXT_TOKENS);
}
