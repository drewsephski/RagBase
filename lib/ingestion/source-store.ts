import type { Source, SourceType } from "@/lib/domain/definitions";
import { estimateTokenCount, type TextChunk } from "@/lib/ingestion/chunk";
import { IngestionError, type ParsedSourceContent } from "@/lib/ingestion/types";
import { createServiceClient } from "@/lib/supabase/server";

const UPLOADS_BUCKET = "uploads";

export interface SourceRow {
  id: string;
  workspace_id: string;
  type: SourceType;
  name: string;
  status: Source["status"];
  storage_path: string | null;
  metadata: Record<string, unknown> | null;
  error_message: string | null;
}

interface StoredChunkRow {
  document_id: string;
  chunk_text: string;
  page_number: number | null;
  source_location: string | null;
  chunk_index: number;
  embedding: number[];
}

export interface SourceStore {
  fetchSource(sourceId: string): Promise<SourceRow>;
  setSourceStatus(
    sourceId: string,
    status: Source["status"],
    errorMessage?: string | null,
    metadataPatch?: Record<string, unknown> | null,
  ): Promise<void>;
  deleteExistingDocuments(sourceId: string): Promise<void>;
  storeDocumentAndChunks(
    sourceId: string,
    parsed: ParsedSourceContent,
    chunks: TextChunk[],
    embeddings: number[][],
  ): Promise<void>;
  loadFileBuffer(storagePath: string): Promise<Buffer>;
}

export function createSupabaseSourceStore(): SourceStore {
  return {
    fetchSource,
    setSourceStatus,
    deleteExistingDocuments,
    storeDocumentAndChunks,
    loadFileBuffer,
  };
}

async function fetchSource(sourceId: string): Promise<SourceRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sources")
    .select("id, workspace_id, type, name, status, storage_path, metadata, error_message")
    .eq("id", sourceId)
    .single();

  if (error || !data) {
    throw new IngestionError(error?.message ?? "Source not found.");
  }

  return data as SourceRow;
}

async function setSourceStatus(
  sourceId: string,
  status: Source["status"],
  errorMessage: string | null = null,
  metadataPatch: Record<string, unknown> | null = null,
): Promise<void> {
  const supabase = createServiceClient();

  let metadataUpdate: Record<string, unknown> | undefined;

  if (metadataPatch) {
    const { data: existing } = await supabase
      .from("sources")
      .select("metadata")
      .eq("id", sourceId)
      .single();

    const currentMetadata =
      existing?.metadata && typeof existing.metadata === "object"
        ? (existing.metadata as Record<string, unknown>)
        : {};

    metadataUpdate = { ...currentMetadata, ...metadataPatch };
  }

  const { error } = await supabase
    .from("sources")
    .update({
      status,
      error_message: errorMessage,
      ...(metadataUpdate ? { metadata: metadataUpdate } : {}),
    })
    .eq("id", sourceId);

  if (error) {
    throw new IngestionError(`Failed to update source status: ${error.message}`);
  }
}

async function deleteExistingDocuments(sourceId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("source_id", sourceId);

  if (error) {
    throw new IngestionError(`Failed to clear previous document data: ${error.message}`);
  }
}

async function storeDocumentAndChunks(
  sourceId: string,
  parsed: ParsedSourceContent,
  chunks: TextChunk[],
  embeddings: number[][],
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new IngestionError("Chunk and embedding counts do not match.");
  }

  const supabase = createServiceClient();

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      source_id: sourceId,
      raw_text: parsed.rawText,
      page_count: parsed.pageCount,
      token_count: estimateTokenCount(parsed.rawText),
    })
    .select("id")
    .single();

  if (documentError || !document) {
    throw new IngestionError(
      documentError?.message ?? "Failed to store parsed document.",
    );
  }

  const chunkRows: StoredChunkRow[] = chunks.map((chunk, index) => {
    const embedding = embeddings[index];

    if (!embedding) {
      throw new IngestionError(`Missing embedding for chunk ${index + 1}.`);
    }

    return {
      document_id: document.id,
      chunk_text: chunk.text,
      page_number: chunk.pageNumber,
      source_location: chunk.sourceLocation,
      chunk_index: index,
      embedding,
    };
  });

  if (chunkRows.length === 0) {
    throw new IngestionError("No searchable content was produced from this source.");
  }

  const { error: chunkError } = await supabase.from("chunks").insert(chunkRows);

  if (chunkError) {
    throw new IngestionError(`Failed to store chunks: ${chunkError.message}`);
  }
}

async function loadFileBuffer(storagePath: string): Promise<Buffer> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(UPLOADS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new IngestionError(
      error?.message ?? "Failed to download uploaded file from storage.",
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
