import { z } from "zod";

import type { Citation } from "@/app/lib/definitions";
import type { ContextBlock } from "@/lib/retrieval/context";

const rawCitationSchema = z.object({
  ref: z.number().int().positive(),
  chunkId: z.string().uuid(),
  snippet: z.string().min(1),
});

const rawCitationsSchema = z.array(rawCitationSchema);

const CITATIONS_BLOCK_REGEX = /<citations>([\s\S]*?)<\/citations>/i;

export interface ParsedAssistantResponse {
  content: string;
  citations: Citation[];
}

function findContextBlock(
  blocks: ContextBlock[],
  chunkId: string,
): ContextBlock | undefined {
  return blocks.find((block) => block.chunkId === chunkId);
}

function stripCitationsBlock(content: string): string {
  return content.replace(CITATIONS_BLOCK_REGEX, "").trim();
}

export function parseCitationsFromResponse(
  rawContent: string,
  contextBlocks: ContextBlock[],
): ParsedAssistantResponse {
  const match = rawContent.match(CITATIONS_BLOCK_REGEX);
  const content = stripCitationsBlock(rawContent);

  if (!match?.[1]) {
    return { content, citations: [] };
  }

  let parsed: z.infer<typeof rawCitationsSchema>;

  try {
    const json = JSON.parse(match[1].trim()) as unknown;
    parsed = rawCitationsSchema.parse(json);
  } catch {
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
      snippet: item.snippet.trim(),
      context: block.text,
    });
  }

  return { content, citations };
}

export function formatCitationBadge(citation: Citation, index: number): string {
  const page =
    citation.pageNumber != null ? `, p. ${citation.pageNumber}` : "";

  return `[${index + 1}] ${citation.sourceName}${page}`;
}

export function formatCitationFootnote(citation: Citation, index: number): string {
  const page =
    citation.pageNumber != null ? ` (page ${citation.pageNumber})` : "";

  return `[${index + 1}] **${citation.sourceName}**${page}: "${citation.snippet}"`;
}
