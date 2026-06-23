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
        "bg-muted/50 hover:bg-muted border-border/50 rounded-md border text-[11px] font-medium tabular-nums",
        "transition-colors",
      )}
      onClick={() => onClick(citation)}
      aria-label={`View source ${citation.ref}: ${citation.snippet}`}
    >
      {citation.ref}
    </Button>
  );
}
