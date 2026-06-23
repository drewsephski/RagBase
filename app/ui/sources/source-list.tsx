"use client";

import type { Source } from "@/lib/domain/definitions";
import { LIMITS } from "@/lib/domain/definitions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SourceItem } from "@/app/ui/sources/source-item";

interface SourceListProps {
  sources: Source[];
  isLoading: boolean;
  error: string | null;
  scopedSourceId: string | null;
  onToggleScope: (sourceId: string) => void;
  onReprocess: (sourceId: string) => Promise<void>;
  onDelete: (sourceId: string) => Promise<void>;
}

export function SourceList({
  sources,
  isLoading,
  error,
  scopedSourceId,
  onToggleScope,
  onReprocess,
  onDelete,
}: SourceListProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <p className="text-muted-foreground text-xs" aria-live="polite">
          Loading your documents…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <p className="text-muted-foreground text-xs leading-relaxed">
          No documents yet. Upload a file or paste a link below.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Documents
        </h2>
        <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
          {sources.length}/{LIMITS.MAX_SOURCES}
        </span>
      </div>

      <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden">
        <ul className="w-full min-w-0 space-y-1 pr-0.5">
          {sources.map((source) => (
            <li key={source.id} className="min-w-0">
              <SourceItem
                source={source}
                isScoped={scopedSourceId === source.id}
                onToggleScope={() => onToggleScope(source.id)}
                onReprocess={() => onReprocess(source.id)}
                onDelete={() => onDelete(source.id)}
              />
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
