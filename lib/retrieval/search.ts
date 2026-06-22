import type { Citation } from "@/app/lib/definitions";
import { embedQuery } from "@/lib/openrouter/client";
import { createServiceClient } from "@/lib/supabase/server";

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

const DEFAULT_MATCH_COUNT = 8;

export async function searchChunks(
  options: SearchChunksOptions,
): Promise<MatchChunkResult[]> {
  const {
    query,
    workspaceId,
    sourceId = null,
    matchCount = DEFAULT_MATCH_COUNT,
    apiKey,
  } = options;

  const queryEmbedding = await embedQuery(query, apiKey);
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_workspace_id: workspaceId,
    filter_source_id: sourceId,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return (data ?? []) as MatchChunkResult[];
}

export async function countSourceChunks(sourceId: string): Promise<number> {
  const supabase = createServiceClient();

  const { data: documents, error: documentError } = await supabase
    .from("documents")
    .select("id")
    .eq("source_id", sourceId);

  if (documentError) {
    throw new Error(`Failed to count source chunks: ${documentError.message}`);
  }

  if (!documents || documents.length === 0) {
    return 0;
  }

  const documentIds = documents.map((document) => document.id);

  const { count, error } = await supabase
    .from("chunks")
    .select("id", { count: "exact", head: true })
    .in("document_id", documentIds);

  if (error) {
    throw new Error(`Failed to count source chunks: ${error.message}`);
  }

  return count ?? 0;
}

export async function fetchSourceChunksOrdered(
  workspaceId: string,
  sourceId: string,
): Promise<MatchChunkResult[]> {
  const supabase = createServiceClient();

  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .select("id, name")
    .eq("id", sourceId)
    .eq("workspace_id", workspaceId)
    .eq("status", "ready")
    .single();

  if (sourceError || !source) {
    return [];
  }

  const { data: documents, error: documentError } = await supabase
    .from("documents")
    .select("id")
    .eq("source_id", sourceId);

  if (documentError) {
    throw new Error(`Failed to load source chunks: ${documentError.message}`);
  }

  if (!documents || documents.length === 0) {
    return [];
  }

  const documentIds = documents.map((document) => document.id);

  const { data: chunks, error: chunkError } = await supabase
    .from("chunks")
    .select(
      "id, chunk_text, page_number, source_location, document_id, chunk_index",
    )
    .in("document_id", documentIds)
    .order("chunk_index", { ascending: true });

  if (chunkError) {
    throw new Error(`Failed to load source chunks: ${chunkError.message}`);
  }

  return (chunks ?? []).map((chunk) => ({
    id: chunk.id,
    chunk_text: chunk.chunk_text,
    page_number: chunk.page_number,
    source_location: chunk.source_location,
    source_id: source.id,
    source_name: source.name,
    document_id: chunk.document_id,
    chunk_index: chunk.chunk_index ?? 0,
    similarity: 1,
  }));
}

interface DocumentChunkRange {
  documentId: string;
  minIndex: number;
  maxIndex: number;
  sourceId: string;
  sourceName: string;
}

function buildDocumentRanges(seeds: MatchChunkResult[]): DocumentChunkRange[] {
  const ranges = new Map<string, DocumentChunkRange>();

  for (const seed of seeds) {
    const existing = ranges.get(seed.document_id);

    if (!existing) {
      ranges.set(seed.document_id, {
        documentId: seed.document_id,
        minIndex: seed.chunk_index,
        maxIndex: seed.chunk_index,
        sourceId: seed.source_id,
        sourceName: seed.source_name,
      });
      continue;
    }

    existing.minIndex = Math.min(existing.minIndex, seed.chunk_index);
    existing.maxIndex = Math.max(existing.maxIndex, seed.chunk_index);
  }

  return [...ranges.values()];
}

export async function fetchAdjacentChunks(
  seeds: MatchChunkResult[],
  radius: number,
): Promise<MatchChunkResult[]> {
  if (seeds.length === 0 || radius <= 0) {
    return [];
  }

  const supabase = createServiceClient();
  const ranges = buildDocumentRanges(seeds);
  const adjacent: MatchChunkResult[] = [];

  for (const range of ranges) {
    const minIndex = Math.max(0, range.minIndex - radius);
    const maxIndex = range.maxIndex + radius;

    const { data: chunks, error } = await supabase
      .from("chunks")
      .select(
        "id, chunk_text, page_number, source_location, document_id, chunk_index",
      )
      .eq("document_id", range.documentId)
      .gte("chunk_index", minIndex)
      .lte("chunk_index", maxIndex)
      .order("chunk_index", { ascending: true });

    if (error) {
      throw new Error(`Failed to load adjacent chunks: ${error.message}`);
    }

    for (const chunk of chunks ?? []) {
      adjacent.push({
        id: chunk.id,
        chunk_text: chunk.chunk_text,
        page_number: chunk.page_number,
        source_location: chunk.source_location,
        source_id: range.sourceId,
        source_name: range.sourceName,
        document_id: chunk.document_id,
        chunk_index: chunk.chunk_index ?? 0,
        similarity: 0.5,
      });
    }
  }

  return adjacent;
}

export function chunksToCitations(chunks: MatchChunkResult[]): Citation[] {
  return chunks.map((chunk) => ({
    chunkId: chunk.id,
    sourceId: chunk.source_id,
    sourceName: chunk.source_name,
    pageNumber: chunk.page_number,
    snippet: chunk.chunk_text.slice(0, 200),
    context: chunk.chunk_text,
  }));
}
