import {
  dedupeChunks,
  trimChunksToTokenBudget,
} from "@/lib/retrieval/expand";
import type { MatchChunkResult } from "@/lib/retrieval/types";

export function isSmallSource(
  chunkCount: number,
  smallDocMaxChunks: number,
): boolean {
  return chunkCount > 0 && chunkCount <= smallDocMaxChunks;
}

export function getSmallSourceIds(
  sourceIds: string[],
  chunkCountBySourceId: ReadonlyMap<string, number>,
  smallDocMaxChunks: number,
): string[] {
  return sourceIds.filter((sourceId) =>
    isSmallSource(chunkCountBySourceId.get(sourceId) ?? 0, smallDocMaxChunks),
  );
}

export function mergeRetrievalChunks(
  initialMatches: MatchChunkResult[],
  adjacentMatches: MatchChunkResult[],
  smallSourceChunks: MatchChunkResult[],
): MatchChunkResult[] {
  return dedupeChunks([
    ...initialMatches,
    ...adjacentMatches,
    ...smallSourceChunks,
  ]);
}

export function finalizeRetrievalChunks(
  chunks: MatchChunkResult[],
  maxContextTokens: number,
): MatchChunkResult[] {
  return trimChunksToTokenBudget(chunks, maxContextTokens);
}
