import { z } from "zod";

import type { Citation } from "@/lib/domain/definitions";
import type { ContextBlock } from "@/lib/retrieval/context";

import { CITATIONS_BLOCK_REGEX } from "./constants";
import type { DisplayCitation, ParsedAssistantResponse } from "./types";

const rawCitationSchema = z.object({
  ref: z.number().int().positive(),
  chunkId: z.string().uuid(),
  snippet: z.string().min(1),
});

const rawCitationsSchema = z.array(rawCitationSchema);

export function stripCitationsBlock(content: string): string {
  return content.replace(CITATIONS_BLOCK_REGEX, "").trim();
}

export function getDisplayContent(content: string): string {
  return stripCitationsBlock(content);
}

function parseRawCitationsBlock(
  rawContent: string,
): z.infer<typeof rawCitationsSchema> | null {
  const match = rawContent.match(CITATIONS_BLOCK_REGEX);

  if (!match?.[1]) {
    return null;
  }

  try {
    return rawCitationsSchema.parse(JSON.parse(match[1].trim()));
  } catch {
    return null;
  }
}

function findContextBlock(
  blocks: ContextBlock[],
  chunkId: string,
): ContextBlock | undefined {
  return blocks.find((block) => block.chunkId === chunkId);
}

export function parseCitationsFromResponse(
  rawContent: string,
  contextBlocks: ContextBlock[],
): ParsedAssistantResponse {
  const content = stripCitationsBlock(rawContent);
  const parsed = parseRawCitationsBlock(rawContent);

  if (!parsed) {
    return { content, citations: [] };
  }

  const citations: Citation[] = [];

  for (const item of parsed) {
    const block = findContextBlock(contextBlocks, item.chunkId);
    if (!block) {
      continue;
    }

    citations.push({
      chunkId: block.chunkId,
      sourceId: block.sourceId,
      sourceName: block.sourceName,
      pageNumber: block.pageNumber,
      sourceLocation: block.sourceLocation,
      snippet: item.snippet.trim(),
      context: block.text,
    });
  }

  return { content, citations };
}

export function citationsToDisplay(citations: Citation[]): DisplayCitation[] {
  return citations.map((citation, index) => ({
    ref: index + 1,
    chunkId: citation.chunkId,
    sourceId: citation.sourceId,
    sourceName: citation.sourceName,
    pageNumber: citation.pageNumber,
    sourceLocation: citation.sourceLocation,
    snippet: citation.snippet,
    context: citation.context,
  }));
}

export function parseDisplayCitationsFromContent(
  content: string,
): DisplayCitation[] {
  const parsed = parseRawCitationsBlock(content);

  if (!parsed) {
    return [];
  }

  return parsed.map((item) => ({
    ref: item.ref,
    chunkId: item.chunkId,
    snippet: item.snippet.trim(),
  }));
}

export function getMessageDisplayCitations(
  content: string,
  persisted?: Citation[] | null,
): DisplayCitation[] {
  if (persisted && persisted.length > 0) {
    return citationsToDisplay(persisted);
  }

  return parseDisplayCitationsFromContent(content);
}
