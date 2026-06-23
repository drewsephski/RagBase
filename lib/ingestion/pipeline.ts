import {
  chunkPlainText,
  chunkText,
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
import {
  createSupabaseSourceStore,
  type SourceRow,
  type SourceStore,
} from "@/lib/ingestion/source-store";
import { IngestionError, type ParsedSourceContent } from "@/lib/ingestion/types";
import { scrapeUrl } from "@/lib/ingestion/url";
import { getFileKind, type FileKind } from "@/lib/ingestion/validate";
import { resolveIngestionFailure } from "@/lib/ingestion/user-errors";

export type { SourceStore } from "@/lib/ingestion/source-store";

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

async function parseTextBuffer(
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

async function parseUrlSource(
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

async function parseSourceContent(
  source: SourceRow,
  options: IngestionPipelineOptions = {},
  store: SourceStore = createSupabaseSourceStore(),
): Promise<ParsedSourceContent> {
  if (source.type === "file") {
    if (!source.storage_path) {
      throw new IngestionError("Uploaded file is missing from storage.");
    }

    const buffer =
      options.prefetchedFileBuffer ??
      (await store.loadFileBuffer(source.storage_path));
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
      const buffer = await store.loadFileBuffer(source.storage_path);
      cachedMarkdown = buffer.toString("utf8").trim();
    }

    const cachedTitle = getMetadataString(source.metadata, "title");

    return parseUrlSource(url, cachedMarkdown, cachedTitle);
  }

  throw new IngestionError(`Unsupported source type: ${source.type}`);
}

function buildChunks(segments: TextSegment[]): TextChunk[] {
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

export async function runIngestionPipeline(
  sourceId: string,
  options: IngestionPipelineOptions = {},
  store: SourceStore = createSupabaseSourceStore(),
): Promise<void> {
  await store.setSourceStatus(sourceId, "processing", null, {
    errorCategory: null,
    ingestionPhase: null,
  });

  try {
    const source = await store.fetchSource(sourceId);
    await store.deleteExistingDocuments(sourceId);

    const buffer =
      source.type === "file" && source.storage_path
        ? options.prefetchedFileBuffer ??
          (await store.loadFileBuffer(source.storage_path))
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
      await store.setSourceStatus(sourceId, "processing", null, {
        ingestionPhase: "ocr",
      });
    }

    const parsed = await parseSourceContent(source, {
      ...options,
      ...(buffer ? { prefetchedFileBuffer: buffer } : {}),
      ...(prefetchedPdfParse ? { prefetchedPdfParse } : {}),
    }, store);

    if (needsOcr) {
      await store.setSourceStatus(sourceId, "processing", null, {
        ingestionPhase: null,
      });
    }

    const chunks = buildChunks(parsed.segments);

    if (chunks.length === 0) {
      throw new IngestionError("No searchable content was found in this source.");
    }

    const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));
    await store.storeDocumentAndChunks(sourceId, parsed, chunks, embeddings);
    await store.setSourceStatus(sourceId, "ready", null, {
      ingestionPhase: null,
      errorCategory: null,
    });
  } catch (error) {
    const failure = resolveIngestionFailure(error);
    await store.setSourceStatus(sourceId, "error", failure.message, {
      ingestionPhase: null,
      errorCategory: failure.category,
    });
    throw error;
  }
}
