import type { TextSegment } from "@/lib/ingestion/chunk";

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
