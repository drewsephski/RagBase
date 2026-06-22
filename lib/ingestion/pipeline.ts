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
  parsePdf,
  pdfPagesToSegments,
  ScannedPdfError,
} from "@/lib/ingestion/pdf";
import { scrapeUrl, UrlScrapeError } from "@/lib/ingestion/url";
import { getFileKind, type FileKind } from "@/lib/ingestion/validate";
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

export async function parseTextBuffer(
  buffer: Buffer,
  kind: FileKind,
  sourceName: string,
): Promise<ParsedSourceContent> {
  switch (kind) {
    case "pdf": {
      const parsed = await parsePdf(buffer);

      return {
        rawText: parsed.rawText,
        pageCount: parsed.pageCount,
        segments: pdfPagesToSegments(parsed.pages),
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

export async function parseSourceContent(source: SourceRow): Promise<ParsedSourceContent> {
  if (source.type === "file") {
    if (!source.storage_path) {
      throw new IngestionError("Uploaded file is missing from storage.");
    }

    const buffer = await loadFileBuffer(source.storage_path);
    const kind = getFileKind(source.name);
    return parseTextBuffer(buffer, kind, source.name);
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
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("sources")
    .update({
      status,
      error_message: errorMessage,
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

function toUserFacingError(error: unknown): string {
  if (error instanceof ScannedPdfError) {
    return error.message;
  }

  if (error instanceof UrlScrapeError) {
    return error.message;
  }

  if (error instanceof IngestionError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Document processing failed. Try again or upload a different file.";
}

export async function runIngestionPipeline(sourceId: string): Promise<void> {
  await setSourceStatus(sourceId, "processing", null);

  try {
    const source = await fetchSource(sourceId);
    await deleteExistingDocuments(sourceId);

    const parsed = await parseSourceContent(source);
    const chunks = buildChunks(parsed.segments);

    if (chunks.length === 0) {
      throw new IngestionError("No searchable content was found in this source.");
    }

    const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));
    await storeDocumentAndChunks(sourceId, parsed, chunks, embeddings);
    await setSourceStatus(sourceId, "ready", null);
  } catch (error) {
    const message = toUserFacingError(error);
    await setSourceStatus(sourceId, "error", message);
    throw error;
  }
}

export async function reprocessSource(sourceId: string): Promise<void> {
  await runIngestionPipeline(sourceId);
}
