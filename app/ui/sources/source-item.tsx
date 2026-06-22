"use client";

import type { Source } from "@/app/lib/definitions";
import { FileText, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceActions, StatusBadge } from "@/app/ui/sources/source-actions";

interface SourceItemProps {
  source: Source;
  isScoped: boolean;
  onToggleScope: () => void;
  onReprocess: () => Promise<void>;
  onDelete: () => Promise<void>;
  disabled?: boolean;
}

function SourceIcon({ type }: { type: Source["type"] }) {
  if (type === "url") {
    return <Globe className="size-4 shrink-0" aria-hidden />;
  }

  return <FileText className="size-4 shrink-0" aria-hidden />;
}

export function SourceItem({
  source,
  isScoped,
  onToggleScope,
  onReprocess,
  onDelete,
  disabled = false,
}: SourceItemProps) {
  const isLoading =
    source.status === "pending" || source.status === "processing";

  return (
    <article
      className={cn(
        "rounded-lg border p-3 transition-colors",
        isScoped && "border-primary/50 bg-primary/5",
      )}
      aria-label={`Document: ${source.name}`}
    >
      <div className="flex items-start gap-2">
        <div className="text-muted-foreground mt-0.5">
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" aria-label="Processing" />
          ) : (
            <SourceIcon type={source.type} />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-medium" title={source.name}>
              {source.name}
            </p>
            <StatusBadge status={source.status} />
          </div>

          {source.status === "error" && source.error_message ? (
            <p className="text-destructive text-xs" role="alert">
              {source.error_message}
            </p>
          ) : null}

          <SourceActions
            source={source}
            isScoped={isScoped}
            onToggleScope={onToggleScope}
            onReprocess={onReprocess}
            onDelete={onDelete}
            disabled={disabled}
          />
        </div>
      </div>
    </article>
  );
}
