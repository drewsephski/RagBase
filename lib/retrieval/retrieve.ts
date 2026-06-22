import { RETRIEVAL } from "@/lib/retrieval/config";
import {
  dedupeChunks,
  trimChunksToTokenBudget,
  uniqueSourceIds,
} from "@/lib/retrieval/expand";
import {
  countSourceChunks,
  fetchAdjacentChunks,
  fetchSourceChunksOrdered,
  searchChunks,
  type MatchChunkResult,
  type SearchChunksOptions,
} from "@/lib/retrieval/search";

async function loadSmallSourceIfApplicable(
  workspaceId: string,
  sourceId: string,
): Promise<MatchChunkResult[] | null> {
  const chunkCount = await countSourceChunks(sourceId);

  if (chunkCount === 0 || chunkCount > RETRIEVAL.SMALL_DOC_MAX_CHUNKS) {
    return null;
  }

  return fetchSourceChunksOrdered(workspaceId, sourceId);
}

async function expandSmallSourcesFromSeeds(
  workspaceId: string,
  seeds: MatchChunkResult[],
): Promise<MatchChunkResult[]> {
  const expanded = [...seeds];
  const sourceIds = uniqueSourceIds(seeds);

  for (const sourceId of sourceIds) {
    const chunkCount = await countSourceChunks(sourceId);

    if (chunkCount === 0 || chunkCount > RETRIEVAL.SMALL_DOC_MAX_CHUNKS) {
      continue;
    }

    const allChunks = await fetchSourceChunksOrdered(workspaceId, sourceId);
    expanded.push(...allChunks);
  }

  return expanded;
}

export async function retrieveForChat(
  options: SearchChunksOptions,
): Promise<MatchChunkResult[]> {
  const { workspaceId, sourceId = null } = options;

  if (sourceId) {
    const smallSourceChunks = await loadSmallSourceIfApplicable(
      workspaceId,
      sourceId,
    );

    if (smallSourceChunks) {
      return trimChunksToTokenBudget(
        smallSourceChunks,
        RETRIEVAL.MAX_CONTEXT_TOKENS,
      );
    }
  }

  const initialMatches = await searchChunks({
    ...options,
    matchCount: options.matchCount ?? RETRIEVAL.INITIAL_MATCH_COUNT,
  });

  const adjacentMatches = await fetchAdjacentChunks(
    initialMatches,
    RETRIEVAL.ADJACENT_CHUNK_RADIUS,
  );

  const withSmallSourceExpansion = await expandSmallSourcesFromSeeds(
    workspaceId,
    initialMatches,
  );

  const merged = dedupeChunks([
    ...initialMatches,
    ...adjacentMatches,
    ...withSmallSourceExpansion,
  ]);

  return trimChunksToTokenBudget(merged, RETRIEVAL.MAX_CONTEXT_TOKENS);
}
