import type { SupabaseClient } from "@supabase/supabase-js";

import {
  findContextBlock,
  parseCitationsFromResponse,
} from "@/lib/chat/citations";
import { parseRawCitationItems } from "@/lib/chat/citations/block";
import type { Citation } from "@/lib/domain/definitions";
import type { ContextBlock } from "@/lib/retrieval/context";

interface ChunkLookupRow {
  id: string;
  chunk_text: string;
  page_number: number | null;
  source_location: string | null;
  documents: {
    source_id: string;
    sources: {
      id: string;
      name: string;
      workspace_id: string;
    };
  };
}

async function fetchCitationChunksById(
  supabase: SupabaseClient,
  workspaceId: string,
  chunkIds: string[],
): Promise<Map<string, ChunkLookupRow>> {
  if (chunkIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("chunks")
    .select(
      "id, chunk_text, page_number, source_location, documents!inner(source_id, sources!inner(id, name, workspace_id))",
    )
    .in("id", chunkIds);

  if (error) {
    console.error("Failed to resolve citation chunks:", error.message);
    return new Map();
  }

  const byId = new Map<string, ChunkLookupRow>();

  for (const row of data ?? []) {
    const chunk = row as unknown as ChunkLookupRow;

    if (chunk.documents.sources.workspace_id !== workspaceId) {
      continue;
    }

    byId.set(chunk.id, chunk);
  }

  return byId;
}

function citationFromChunkRow(
  row: ChunkLookupRow,
  snippet: string,
): Citation {
  return {
    chunkId: row.id,
    sourceId: row.documents.sources.id,
    sourceName: row.documents.sources.name,
    pageNumber: row.page_number,
    sourceLocation: row.source_location,
    snippet,
    context: row.chunk_text,
  };
}

function citationFromContextBlock(
  block: ContextBlock,
  snippet: string,
): Citation {
  return {
    chunkId: block.chunkId,
    sourceId: block.sourceId,
    sourceName: block.sourceName,
    pageNumber: block.pageNumber,
    sourceLocation: block.sourceLocation,
    snippet,
    context: block.text,
  };
}

export async function resolveStorageCitations(
  supabase: SupabaseClient,
  workspaceId: string,
  rawContent: string,
  contextBlocks: ContextBlock[],
) {
  const parsedResponse = parseCitationsFromResponse(rawContent, contextBlocks);
  const resolvedChunkIds = new Set(
    parsedResponse.citations.map((citation) => citation.chunkId),
  );
  const rawItems = parseRawCitationItems(rawContent);

  if (rawItems.length === 0) {
    return parsedResponse;
  }

  const unresolvedChunkIds = rawItems
    .filter((item) => !resolvedChunkIds.has(item.chunkId))
    .map((item) => item.chunkId);

  const chunkRows = await fetchCitationChunksById(
    supabase,
    workspaceId,
    unresolvedChunkIds,
  );

  const citations: Citation[] = [...parsedResponse.citations];

  for (const item of rawItems) {
    const contextBlock = findContextBlock(contextBlocks, item);
    const resolvedChunkId = contextBlock?.chunkId ?? item.chunkId;

    if (resolvedChunkIds.has(resolvedChunkId)) {
      continue;
    }

    const chunkRow = chunkRows.get(item.chunkId);
    if (chunkRow) {
      citations.push(citationFromChunkRow(chunkRow, item.snippet));
      resolvedChunkIds.add(chunkRow.id);
      continue;
    }

    if (!contextBlock) {
      continue;
    }

    citations.push(citationFromContextBlock(contextBlock, item.snippet));
    resolvedChunkIds.add(contextBlock.chunkId);
  }

  return {
    content: parsedResponse.content,
    citations,
  };
}
