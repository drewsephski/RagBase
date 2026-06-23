export interface MatchChunkResult {
  id: string;
  chunk_text: string;
  page_number: number | null;
  source_location: string | null;
  source_id: string;
  source_name: string;
  document_id: string;
  chunk_index: number;
  similarity: number;
}

export interface SearchChunksOptions {
  query: string;
  workspaceId: string;
  sourceId?: string | null;
  matchCount?: number;
  apiKey?: string;
}
