"use client";

import { FileText, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatContextBarProps {
  scopedSourceName?: string | null;
  readySourceCount: number;
  totalSourceCount: number;
  className?: string;
}

export function ChatContextBar({
  scopedSourceName,
  readySourceCount,
  totalSourceCount,
  className,
}: ChatContextBarProps) {
  const isScoped = Boolean(scopedSourceName);

  return (
    <div
      className={cn(
        "chat-context-bar mx-3 mt-2.5 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 sm:mx-5 sm:mt-3 sm:gap-3 sm:px-4 sm:py-3",
        className,
      )}
      role="status"
    >
      <span
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-lg border sm:size-8",
          isScoped
            ? "border-primary/20 bg-primary/8 text-primary"
            : "border-border/60 bg-muted/40 text-muted-foreground",
        )}
        aria-hidden
      >
        {isScoped ? (
          <FileText className="size-3.5 sm:size-4" strokeWidth={2} />
        ) : (
          <Layers className="size-3.5 sm:size-4" strokeWidth={2} />
        )}
      </span>

      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[13px] font-medium leading-tight tracking-tight sm:text-sm">
          {isScoped ? scopedSourceName : "All documents"}
        </p>
        <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug tracking-wide sm:text-xs">
          {isScoped
            ? "Answers use only this document"
            : `${readySourceCount} of ${totalSourceCount} ready · cited answers`}
        </p>
      </div>

      <span
        className={cn(
          "chat-status-pill text-muted-foreground hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium tracking-wide uppercase sm:inline",
        )}
      >
        {isScoped ? "Scoped" : "All sources"}
      </span>
    </div>
  );
}
