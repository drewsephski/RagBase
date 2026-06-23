import type { SupabaseClient } from "@supabase/supabase-js";

import { parseCitationsFromResponse } from "@/lib/chat/citations";
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

  const citationsBlockMatch = rawContent.match(
    /<citations>([\s\S]*?)<\/citations>/i,
  );

  if (!citationsBlockMatch?.[1]) {
    return parsedResponse;
  }

  let rawItems: Array<{ ref: number; chunkId: string; snippet: string }> = [];

  try {
    const normalizedJson = citationsBlockMatch[1]
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const parsed = JSON.parse(normalizedJson) as unknown;

    if (!Array.isArray(parsed)) {
      return parsedResponse;
    }

    rawItems = parsed.flatMap((item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as { ref?: unknown }).ref !== "number" ||
        typeof (item as { chunkId?: unknown }).chunkId !== "string" ||
        typeof (item as { snippet?: unknown }).snippet !== "string"
      ) {
        return [];
      }

      return [
        {
          ref: (item as { ref: number }).ref,
          chunkId: (item as { chunkId: string }).chunkId,
          snippet: (item as { snippet: string }).snippet.trim(),
        },
      ];
    });
  } catch {
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
    if (resolvedChunkIds.has(item.chunkId)) {
      continue;
    }

    const chunkRow = chunkRows.get(item.chunkId);
    if (!chunkRow) {
      continue;
    }

    citations.push(citationFromChunkRow(chunkRow, item.snippet));
    resolvedChunkIds.add(chunkRow.id);
  }

  return {
    content: parsedResponse.content,
    citations,
  };
}
