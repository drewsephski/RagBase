import type { Citation } from "@/lib/domain/definitions";

export function formatCitationFootnote(citation: Citation, index: number): string {
  const page =
    citation.pageNumber != null ? ` (page ${citation.pageNumber})` : "";

  return `[${index + 1}] **${citation.sourceName}**${page}: "${citation.snippet}"`;
}
