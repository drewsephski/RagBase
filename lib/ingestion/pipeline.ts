import type { Source, SourceType } from "@/app/lib/definitions";
import {
  chunkPlainText,
  chunkText,
  estimateTokenCount,
  type TextChunk,
  type TextSegment,
} from "@/lib/ingestion/chunk";
import { parseDocx } from "@/lib/ingestion/docx";
import { embedTexts } from "@/lib/ingestion/embed";
import {
  ingestPdfBuffer,
  type ParsedPdf,
} from "@/lib/ingestion/pdf-ingestion";
import { parsePdf } from "@/lib/ingestion/pdf";
import { scrapeUrl } from "@/lib/ingestion/url";
import { getFileKind, type FileKind } from "@/lib/ingestion/validate";
import { resolveIngestionFailure } from "@/lib/ingestion/user-errors";
import { createServiceClient } from "@/lib/supabase/server";

const UPLOADS_BUCKET = "uploads";

export class IngestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestionError";
  }
}

export interface ParsedSourceContent {
  rawText: string;
  pageCount: number | null;
  segments: TextSegment[];
  title?: string;
}

interface StoredChunkRow {
  document_id: string;
  chunk_text: string;
  page_number: number | null;
  source_location: string | null;
  chunk_index: number;
  embedding: number[];
}

interface SourceRow {
  id: string;
  workspace_id: string;
  type: SourceType;
  name: string;
  status: Source["status"];
  storage_path: string | null;
  metadata: Record<string, unknown> | null;
  error_message: string | null;
}

function getMetadataString(
  metadata: Record<string, unknown> | null,
  key: string,
): string | null {
  if (!metadata) {
    return null;
  }

  const value = metadata[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export interface IngestionPipelineOptions {
  openRouterKey?: string;
  /** Reuse a buffer already loaded from storage (avoids duplicate downloads). */
  prefetchedFileBuffer?: Buffer;
  /** Reuse an earlier PDF probe from the same buffer (avoids duplicate parsing). */
  prefetchedPdfParse?: ParsedPdf;
}

export async function parseTextBuffer(
  buffer: Buffer,
  kind: FileKind,
  sourceName: string,
  options: IngestionPipelineOptions = {},
): Promise<ParsedSourceContent> {
  switch (kind) {
    case "pdf": {
      const outcome = await ingestPdfBuffer(buffer, sourceName, {
        openRouterKey: options.openRouterKey,
        probe: options.prefetchedPdfParse,
      });

      return {
        rawText: outcome.rawText,
        pageCount: outcome.pageCount,
        segments: outcome.segments,
      };
    }
    case "docx": {
      const parsed = await parseDocx(buffer);

      return {
        rawText: parsed.rawText,
        pageCount: null,
        segments: [
          {
            text: parsed.rawText,
            pageNumber: null,
            sourceLocation: sourceName,
          },
        ],
      };
    }
    case "txt":
    case "md": {
      const rawText = buffer.toString("utf8").replace(/\r\n/g, "\n").trim();

      if (rawText.length === 0) {
        throw new IngestionError("The uploaded file does not contain any text.");
      }

      return {
        rawText,
        pageCount: null,
        segments: [
          {
            text: rawText,
            pageNumber: null,
            sourceLocation: sourceName,
          },
        ],
      };
    }
    default: {
      const exhaustiveCheck: never = kind;
      throw new IngestionError(`Unsupported file kind: ${exhaustiveCheck}`);
    }
  }
}

export async function parseUrlSource(
  url: string,
  cachedMarkdown?: string | null,
  cachedTitle?: string | null,
): Promise<ParsedSourceContent> {
  if (cachedMarkdown) {
    return {
      rawText: cachedMarkdown,
      pageCount: null,
      title: cachedTitle ?? undefined,
      segments: [
        {
          text: cachedMarkdown,
          pageNumber: null,
          sourceLocation: url,
        },
      ],
    };
  }

  const scraped = await scrapeUrl(url);

  return {
    rawText: scraped.markdown,
    pageCount: null,
    title: scraped.title,
    segments: [
      {
        text: scraped.markdown,
        pageNumber: null,
        sourceLocation: scraped.url,
      },
    ],
  };
}

export async function loadFileBuffer(
  storagePath: string,
): Promise<Buffer> {
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

export async function parseSourceContent(
  source: SourceRow,
  options: IngestionPipelineOptions = {},
): Promise<ParsedSourceContent> {
  if (source.type === "file") {
    if (!source.storage_path) {
      throw new IngestionError("Uploaded file is missing from storage.");
    }

    const buffer =
      options.prefetchedFileBuffer ??
      (await loadFileBuffer(source.storage_path));
    const kind = getFileKind(source.name);
    return parseTextBuffer(buffer, kind, source.name, options);
  }

  if (source.type === "url") {
    const url =
      getMetadataString(source.metadata, "url") ??
      getMetadataString(source.metadata, "sourceUrl");

    if (!url) {
      throw new IngestionError("URL source is missing its original URL.");
    }

    let cachedMarkdown = getMetadataString(source.metadata, "markdown");

    if (!cachedMarkdown && source.storage_path) {
      const buffer = await loadFileBuffer(source.storage_path);
      cachedMarkdown = buffer.toString("utf8").trim();
    }

    const cachedTitle = getMetadataString(source.metadata, "title");

    return parseUrlSource(url, cachedMarkdown, cachedTitle);
  }

  throw new IngestionError(`Unsupported source type: ${source.type}`);
}

export function buildChunks(segments: TextSegment[]): TextChunk[] {
  const hasPageNumbers = segments.some((segment) => segment.pageNumber !== null);

  if (hasPageNumbers) {
    return chunkText(segments);
  }

  const combinedText = segments
    .map((segment) => segment.text)
    .join("\n\n")
    .trim();
  const sourceLocation = segments.find((segment) => segment.sourceLocation)?.sourceLocation ?? null;

  return chunkPlainText(combinedText, sourceLocation);
}

export async function deleteExistingDocuments(sourceId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("source_id", sourceId);

  if (error) {
    throw new IngestionError(`Failed to clear previous document data: ${error.message}`);
  }
}

async function fetchSource(sourceId: string): Promise<SourceRow> {
  // Caller must verify workspace ownership before invoking the pipeline.
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

export async function runIngestionPipeline(
  sourceId: string,
  options: IngestionPipelineOptions = {},
): Promise<void> {
  await setSourceStatus(sourceId, "processing", null, {
    errorCategory: null,
    ingestionPhase: null,
  });

  try {
    const source = await fetchSource(sourceId);
    await deleteExistingDocuments(sourceId);

    const buffer =
      source.type === "file" && source.storage_path
        ? options.prefetchedFileBuffer ??
          (await loadFileBuffer(source.storage_path))
        : null;
    const fileKind =
      source.type === "file" ? getFileKind(source.name) : null;

    let needsOcr = false;
    let prefetchedPdfParse: ParsedPdf | undefined;

    if (buffer && fileKind === "pdf") {
      prefetchedPdfParse = await parsePdf(buffer);
      needsOcr = prefetchedPdfParse.isLowText;
    }

    if (needsOcr) {
      await setSourceStatus(sourceId, "processing", null, {
        ingestionPhase: "ocr",
      });
    }

    const parsed = await parseSourceContent(source, {
      ...options,
      ...(buffer ? { prefetchedFileBuffer: buffer } : {}),
      ...(prefetchedPdfParse ? { prefetchedPdfParse } : {}),
    });

    if (needsOcr) {
      await setSourceStatus(sourceId, "processing", null, {
        ingestionPhase: null,
      });
    }

    const chunks = buildChunks(parsed.segments);

    if (chunks.length === 0) {
      throw new IngestionError("No searchable content was found in this source.");
    }

    const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));
    await storeDocumentAndChunks(sourceId, parsed, chunks, embeddings);
    await setSourceStatus(sourceId, "ready", null, {
      ingestionPhase: null,
      errorCategory: null,
    });
  } catch (error) {
    const failure = resolveIngestionFailure(error);
    await setSourceStatus(sourceId, "error", failure.message, {
      ingestionPhase: null,
      errorCategory: failure.category,
    });
    throw error;
  }
}

export async function reprocessSource(
  sourceId: string,
  options: IngestionPipelineOptions = {},
): Promise<void> {
  await runIngestionPipeline(sourceId, options);
}
