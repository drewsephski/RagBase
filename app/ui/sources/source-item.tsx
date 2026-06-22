"use client";

import { useEffect, useRef } from "react";
import type { Source } from "@/app/lib/definitions";
import { FileText, Globe, Loader2 } from "lucide-react";
import { trackPaidIntent } from "@/lib/analytics/paid-intent";
import { cn } from "@/lib/utils";
import { getIngestionErrorHint, isScannedPdfError } from "@/lib/sources/ingestion-status";
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
    return <Globe className="size-3 shrink-0" aria-hidden />;
  }

  return <FileText className="size-3 shrink-0" aria-hidden />;
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
  const errorHint = getIngestionErrorHint(source.error_message);
  const ocrIntentTrackedRef = useRef(false);

  useEffect(() => {
    if (
      source.status !== "error" ||
      !isScannedPdfError(source.error_message) ||
      ocrIntentTrackedRef.current
    ) {
      return;
    }

    ocrIntentTrackedRef.current = true;
    trackPaidIntent("ocr", { surface: "ingestion_error" });
  }, [source.error_message, source.status]);

  return (
    <article
      className={cn(
        "w-full max-w-full overflow-hidden rounded-md border px-1.5 py-1.5 transition-colors",
        isScoped && "border-primary/50 bg-primary/5",
      )}
      aria-label={`Document: ${source.name}`}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        <div className="text-muted-foreground mt-0.5 shrink-0">
          {isLoading ? (
            <Loader2 className="size-3 animate-spin" aria-label="Processing" />
          ) : (
            <SourceIcon type={source.type} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <p
              className="min-w-0 flex-1 truncate text-[11px] leading-snug font-medium"
              title={source.name}
            >
              {source.name}
            </p>

            <StatusBadge
              status={source.status}
              className="shrink-0 px-1 py-0 text-[9px] leading-4"
            />
          </div>

          <div className="mt-1 flex min-w-0 justify-end">
            <SourceActions
              source={source}
              isScoped={isScoped}
              onToggleScope={onToggleScope}
              onReprocess={onReprocess}
              onDelete={onDelete}
              disabled={disabled}
            />
          </div>

          {source.status === "error" && source.error_message ? (
            <div className="mt-1 space-y-1" role="alert">
              <p className="text-destructive line-clamp-3 text-[10px] leading-snug">
                {source.error_message}
              </p>
              {errorHint ? (
                <p className="text-muted-foreground text-[10px] leading-snug">
                  {errorHint}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
