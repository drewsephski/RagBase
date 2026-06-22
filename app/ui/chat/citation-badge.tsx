"use client";

import type { ParsedMessageCitation } from "@/lib/chat/parse-message";
import { Button } from "@/components/ui/button";

interface CitationBadgeProps {
  citation: ParsedMessageCitation;
  onClick: (citation: ParsedMessageCitation) => void;
}

export function CitationBadge({ citation, onClick }: CitationBadgeProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mx-0.5 inline-flex h-6 min-w-6 px-1.5 align-baseline text-xs font-semibold"
      onClick={() => onClick(citation)}
      aria-label={`View source ${citation.ref}: ${citation.snippet}`}
    >
      [{citation.ref}]
    </Button>
  );
}
