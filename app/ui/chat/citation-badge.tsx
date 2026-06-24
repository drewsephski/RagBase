"use client";

import type { DisplayCitation } from "@/lib/chat/citations";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CitationBadgeProps {
  citation: DisplayCitation;
  onClick: (citation: DisplayCitation) => void;
}

export function CitationBadge({ citation, onClick }: CitationBadgeProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "text-muted-foreground hover:text-foreground mx-0.5 inline-flex h-5 min-w-5 px-1 align-baseline",
        "chat-status-pill hover:border-primary/25 rounded-md border-0 text-[11px] font-semibold tabular-nums",
        "transition-[color,box-shadow]",
      )}
      onClick={() => onClick(citation)}
      aria-label={`View source ${citation.ref}: ${citation.snippet}`}
    >
      {citation.ref}
    </Button>
  );
}
