import type { MatchChunkResult } from "@/lib/retrieval/types";

export interface ContextBlock {
  ref: number;
  chunkId: string;
  sourceId: string;
  sourceName: string;
  documentId: string;
  chunkIndex: number;
  pageNumber: number | null;
  sourceLocation: string | null;
  text: string;
  similarity: number;
}

function formatSourceLabel(result: MatchChunkResult, ref: number): string {
  const pageLabel =
    result.page_number != null ? ` (page ${result.page_number})` : "";
  const locationLabel = result.source_location
    ? ` — ${result.source_location}`
    : "";

  return `[${ref}] Source: "${result.source_name}"${pageLabel}${locationLabel}`;
}

export function buildContextBlocks(
  results: MatchChunkResult[],
): ContextBlock[] {
  return results.map((result, index) => ({
    ref: index + 1,
    chunkId: result.id,
    sourceId: result.source_id,
    sourceName: result.source_name,
    documentId: result.document_id,
    chunkIndex: result.chunk_index,
    pageNumber: result.page_number,
    sourceLocation: result.source_location,
    text: result.chunk_text,
    similarity: result.similarity,
  }));
}

export function buildContextWindow(results: MatchChunkResult[]): string {
  if (results.length === 0) {
    return "No relevant passages were found in the uploaded documents.";
  }

  const blocks = buildContextBlocks(results);

  return blocks
    .map((block) => {
      const label = formatSourceLabel(
        {
          id: block.chunkId,
          chunk_text: block.text,
          page_number: block.pageNumber,
          source_location: block.sourceLocation,
          source_id: block.sourceId,
          source_name: block.sourceName,
          document_id: block.documentId,
          chunk_index: block.chunkIndex,
          similarity: block.similarity,
        },
        block.ref,
      );

      return `${label}\nchunkId: ${block.chunkId}\n${block.text.trim()}`;
    })
    .join("\n\n---\n\n");
}
