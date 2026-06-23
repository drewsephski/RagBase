import type { Citation } from "@/lib/domain/definitions";

export interface DisplayCitation {
  ref: number;
  chunkId: string;
  sourceId?: string;
  sourceName?: string;
  pageNumber?: number | null;
  sourceLocation?: string | null;
  snippet: string;
  context?: string;
}

export interface ParsedAssistantResponse {
  content: string;
  citations: Citation[];
}
