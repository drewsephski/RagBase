import { estimateTokenCount } from "@/lib/ingestion/chunk";
import type { MatchChunkResult } from "@/lib/retrieval/search";

export function dedupeChunks(chunks: MatchChunkResult[]): MatchChunkResult[] {
  const byId = new Map<string, MatchChunkResult>();

  for (const chunk of chunks) {
    const existing = byId.get(chunk.id);

    if (!existing || chunk.similarity > existing.similarity) {
      byId.set(chunk.id, chunk);
    }
  }

  return [...byId.values()];
}

export function sortChunksForContext(
  chunks: MatchChunkResult[],
): MatchChunkResult[] {
  return [...chunks].sort((left, right) => {
    const sourceCompare = left.source_name.localeCompare(right.source_name);

    if (sourceCompare !== 0) {
      return sourceCompare;
    }

    const leftDocumentId = left.document_id ?? "";
    const rightDocumentId = right.document_id ?? "";
    const documentCompare = leftDocumentId.localeCompare(rightDocumentId);

    if (documentCompare !== 0) {
      return documentCompare;
    }

    return (left.chunk_index ?? 0) - (right.chunk_index ?? 0);
  });
}

export function trimChunksToTokenBudget(
  chunks: MatchChunkResult[],
  maxTokens: number,
): MatchChunkResult[] {
  if (chunks.length === 0) {
    return [];
  }

  const ranked = [...chunks].sort((left, right) => right.similarity - left.similarity);
  const kept = new Map<string, MatchChunkResult>();
  let usedTokens = 0;

  for (const chunk of ranked) {
    const chunkTokens = estimateTokenCount(chunk.chunk_text);

    if (usedTokens + chunkTokens > maxTokens && kept.size > 0) {
      continue;
    }

    kept.set(chunk.id, chunk);
    usedTokens += chunkTokens;
  }

  return sortChunksForContext([...kept.values()]);
}

export function uniqueSourceIds(chunks: MatchChunkResult[]): string[] {
  return [...new Set(chunks.map((chunk) => chunk.source_id))];
}
