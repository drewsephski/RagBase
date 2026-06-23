import type { DisplayCitation } from "./types";

const FALLBACK_CHUNK_ID = "00000000-0000-4000-8000-000000000000";

export function createFallbackCitation(ref: number): DisplayCitation {
  return {
    ref,
    chunkId: FALLBACK_CHUNK_ID,
    snippet: "Source details are loading or unavailable.",
  };
}

export function isFallbackCitation(citation: DisplayCitation): boolean {
  return citation.chunkId === FALLBACK_CHUNK_ID;
}
