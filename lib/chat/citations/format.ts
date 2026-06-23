import type { Citation } from "@/lib/domain/definitions";

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
