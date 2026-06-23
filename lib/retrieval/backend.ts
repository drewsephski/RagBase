import {
  countSourceChunks,
  fetchAdjacentChunks,
  fetchSourceChunksOrdered,
  searchChunks,
} from "@/lib/retrieval/search";
import type {
  MatchChunkResult,
  SearchChunksOptions,
} from "@/lib/retrieval/types";

export type { MatchChunkResult, SearchChunksOptions };

export interface SearchBackend {
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

export function createSupabaseSearchBackend(): SearchBackend {
  return {
    searchChunks,
    countSourceChunks,
    fetchSourceChunksOrdered,
    fetchAdjacentChunks,
  };
}
