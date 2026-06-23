import { z } from "zod";

import type { Citation } from "@/lib/domain/definitions";
import type { ContextBlock } from "@/lib/retrieval/context";

import { CITATIONS_BLOCK_REGEX } from "./constants";
import { extractCitationRefs } from "./display";
import { createFallbackCitation } from "./fallback";
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

export function stripPartialCitationsBlock(content: string): string {
  const withoutCompleteBlock = stripCitationsBlock(content);
  const partialBlockIndex = withoutCompleteBlock.search(/<citations\b/i);

  if (partialBlockIndex === -1) {
    return withoutCompleteBlock;
  }

  return withoutCompleteBlock.slice(0, partialBlockIndex).trim();
}

export function getDisplayContent(content: string): string {
  return stripPartialCitationsBlock(content);
}

function parseRawCitationsBlock(
  rawContent: string,
): z.infer<typeof rawCitationsSchema> | null {
  const match = rawContent.match(CITATIONS_BLOCK_REGEX);

  if (!match?.[1]) {
    return null;
  }

  const normalizedJson = match[1]
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return rawCitationsSchema.parse(JSON.parse(normalizedJson));
  } catch {
    return null;
  }
}

function mergeWithInlineMarkers(
  displayContent: string,
  citations: DisplayCitation[],
): DisplayCitation[] {
  const byRef = new Map(citations.map((citation) => [citation.ref, citation]));

  for (const ref of extractCitationRefs(displayContent)) {
    if (!byRef.has(ref)) {
      byRef.set(ref, createFallbackCitation(ref));
    }
  }

  return Array.from(byRef.values()).sort(
    (left, right) => left.ref - right.ref,
  );
}

function findContextBlock(
  blocks: ContextBlock[],
  item: { ref: number; chunkId: string },
): ContextBlock | undefined {
  return (
    blocks.find((block) => block.chunkId === item.chunkId) ??
    blocks.find((block) => block.ref === item.ref)
  );
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
    const block = findContextBlock(contextBlocks, item);
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
  const displayContent = getDisplayContent(content);

  if (persisted && persisted.length > 0) {
    return mergeWithInlineMarkers(displayContent, citationsToDisplay(persisted));
  }

  const parsed = parseDisplayCitationsFromContent(content);
  if (parsed.length > 0) {
    return mergeWithInlineMarkers(displayContent, parsed);
  }

  return extractCitationRefs(displayContent).map(createFallbackCitation);
}

export function resolveDisplayCitations(content: string): DisplayCitation[] {
  return getMessageDisplayCitations(content);
}
