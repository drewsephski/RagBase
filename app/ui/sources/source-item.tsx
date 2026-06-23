"use client";

import { useEffect, useRef } from "react";
import type { Source } from "@/lib/domain/definitions";
import { FileText, Globe, Loader2 } from "lucide-react";
import { trackPaidIntent } from "@/lib/analytics/paid-intent";
import { cn } from "@/lib/utils";
import { getIngestionFailureDisplay } from "@/lib/ingestion/user-errors";
import { parseCrawlMetadata } from "@/lib/ingestion/crawl/types";
import { SourceActions, StatusBadge } from "@/app/ui/sources/source-actions";
import { CrawlSourceItem } from "@/app/ui/sources/crawl-source-item";
import type { WorkspaceHeaders } from "@/lib/api/types";

interface SourceItemProps {
  source: Source;
  workspaceHeaders?: WorkspaceHeaders | null;
  isScoped: boolean;
  scopedDocumentId?: string | null;
  onToggleScope: () => void;
  onScopePage?: (documentId: string) => void;
  onCancelCrawl?: () => Promise<void>;
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
  workspaceHeaders = null,
  isScoped,
  scopedDocumentId = null,
  onToggleScope,
  onScopePage,
  onCancelCrawl,
  onReprocess,
  onDelete,
  disabled = false,
}: SourceItemProps) {
  const crawlMeta = parseCrawlMetadata(
    source.metadata as Record<string, unknown> | null,
  );

  if (crawlMeta && onScopePage && onCancelCrawl) {
    return (
      <CrawlSourceItem
        source={source}
        workspaceHeaders={workspaceHeaders}
        isScoped={isScoped}
        scopedDocumentId={scopedDocumentId}
        onToggleScope={onToggleScope}
        onScopePage={onScopePage}
        onCancelCrawl={onCancelCrawl}
        onDelete={onDelete}
        disabled={disabled}
      />
    );
  }

  const isLoading =
    source.status === "pending" || source.status === "processing";
  const failure = getIngestionFailureDisplay(source);
  const ocrIntentTrackedRef = useRef(false);

  useEffect(() => {
    if (
      source.status !== "error" ||
      !failure?.isOcrUpsell ||
      ocrIntentTrackedRef.current
    ) {
      return;
    }

    ocrIntentTrackedRef.current = true;
    trackPaidIntent("ocr", { surface: "ingestion_error" });
  }, [failure?.isOcrUpsell, source.status]);

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
              source={source}
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
              {failure?.recovery ? (
                <p className="text-muted-foreground text-[10px] leading-snug">
                  {failure.recovery}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
