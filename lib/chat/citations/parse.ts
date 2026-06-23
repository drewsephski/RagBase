import type { Citation } from "@/lib/domain/definitions";
import type { ContextBlock } from "@/lib/retrieval/context";

import { parseRawCitationItems } from "./block";
import { CITATIONS_BLOCK_REGEX } from "./constants";
import { extractCitationRefs } from "./display";
import { createFallbackCitation } from "./fallback";
import type { DisplayCitation, ParsedAssistantResponse } from "./types";

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

function buildDisplayCitationsFromPersisted(
  persisted: Citation[],
  content: string,
): DisplayCitation[] {
  const parsed = parseRawCitationItems(content);
  const persistedByChunkId = new Map(
    persisted.map((citation) => [citation.chunkId, citation]),
  );

  if (parsed.length > 0) {
    return parsed.map((item) => {
      const stored = persistedByChunkId.get(item.chunkId);

      return {
        ref: item.ref,
        chunkId: item.chunkId,
        snippet: item.snippet,
        ...(stored
          ? {
              sourceId: stored.sourceId,
              sourceName: stored.sourceName,
              pageNumber: stored.pageNumber,
              sourceLocation: stored.sourceLocation,
              context: stored.context,
            }
          : {}),
      };
    });
  }

  return citationsToDisplay(persisted);
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

export function findContextBlock(
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
  const parsed = parseRawCitationItems(rawContent);

  if (parsed.length === 0) {
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
  return parseRawCitationItems(content).map((item) => ({
    ref: item.ref,
    chunkId: item.chunkId,
    snippet: item.snippet,
  }));
}

export function getMessageDisplayCitations(
  content: string,
  persisted?: Citation[] | null,
): DisplayCitation[] {
  const displayContent = getDisplayContent(content);

  if (persisted && persisted.length > 0) {
    return mergeWithInlineMarkers(
      displayContent,
      buildDisplayCitationsFromPersisted(persisted, content),
    );
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
