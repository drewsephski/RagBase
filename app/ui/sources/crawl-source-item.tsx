"use client";

import { useCallback, useEffect, useState } from "react";
import type { Source } from "@/lib/domain/definitions";
import type { WorkspaceHeaders } from "@/lib/api/types";
import { apiJson } from "@/lib/api/client";
import { ChevronDown, ChevronRight, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseCrawlMetadata } from "@/lib/ingestion/crawl/types";
import { getCrawlSourceStatusLabel, isActiveCrawlSource } from "@/lib/sources/crawl-status";
import { SourceActions, StatusBadge } from "@/app/ui/sources/source-actions";
import { Button } from "@/components/ui/button";

interface CrawlPage {
  id: string;
  title: string | null;
  path: string | null;
  url: string | null;
  status: string | null;
}

interface CrawlSourceItemProps {
  source: Source;
  workspaceHeaders: WorkspaceHeaders | null;
  isScoped: boolean;
  scopedDocumentId: string | null;
  onToggleScope: () => void;
  onScopePage: (documentId: string) => void;
  onCancelCrawl: () => Promise<void>;
  onDelete: () => Promise<void>;
  disabled?: boolean;
}

export function CrawlSourceItem({
  source,
  workspaceHeaders,
  isScoped,
  scopedDocumentId,
  onToggleScope,
  onScopePage,
  onCancelCrawl,
  onDelete,
  disabled = false,
}: CrawlSourceItemProps) {
  const crawlMeta = parseCrawlMetadata(
    source.metadata as Record<string, unknown> | null,
  );
  const [expanded, setExpanded] = useState(true);
  const [pages, setPages] = useState<CrawlPage[]>([]);
  const [isCanceling, setIsCanceling] = useState(false);
  const isLoading =
    source.status === "pending" ||
    source.status === "processing" ||
    isActiveCrawlSource(source);

  const loadPages = useCallback(async () => {
    if (!workspaceHeaders || !crawlMeta) {
      return;
    }

    try {
      const data = await apiJson<{ pages: CrawlPage[] }>(
        `/api/sources/${source.id}/crawl/pages`,
        { workspaceHeaders },
      );
      setPages(data.pages);
    } catch {
      setPages([]);
    }
  }, [crawlMeta, source.id, workspaceHeaders]);

  useEffect(() => {
    if (!crawlMeta || crawlMeta.pageCount === 0) {
      return;
    }

    void loadPages();
  }, [crawlMeta, crawlMeta?.pageCount, loadPages]);

  useEffect(() => {
    if (!isLoading || !workspaceHeaders) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadPages();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [isLoading, loadPages, workspaceHeaders]);

  async function handleCancelCrawl() {
    setIsCanceling(true);
    try {
      await onCancelCrawl();
    } finally {
      setIsCanceling(false);
    }
  }

  const statusLabel = getCrawlSourceStatusLabel(source);

  return (
    <article
      className={cn(
        "w-full max-w-full overflow-hidden rounded-md border px-1.5 py-1.5 transition-colors",
        (isScoped || scopedDocumentId) && "border-primary/50 bg-primary/5",
      )}
      aria-label={`Site crawl: ${source.name}`}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        <div className="text-muted-foreground mt-0.5 shrink-0">
          {isLoading ? (
            <Loader2 className="size-3 animate-spin" aria-label="Processing" />
          ) : (
            <Globe className="size-3 shrink-0" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setExpanded((current) => !current)}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse page list" : "Expand page list"}
            >
              {expanded ? (
                <ChevronDown className="size-3" aria-hidden />
              ) : (
                <ChevronRight className="size-3" aria-hidden />
              )}
            </button>

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

          {statusLabel && statusLabel !== "Ready" ? (
            <p className="text-muted-foreground mt-0.5 text-[10px] leading-snug">
              {statusLabel}
            </p>
          ) : null}

          <div className="mt-1 flex min-w-0 flex-wrap items-center justify-end gap-1">
            {isLoading ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || isCanceling}
                onClick={() => void handleCancelCrawl()}
                className="h-6 px-1.5 text-[10px] font-normal"
              >
                {isCanceling ? "Canceling…" : "Cancel crawl"}
              </Button>
            ) : null}

            {source.status === "ready" ? (
              <SourceActions
                source={source}
                isScoped={isScoped && !scopedDocumentId}
                onToggleScope={onToggleScope}
                onReprocess={async () => {}}
                onDelete={onDelete}
                disabled={disabled}
                showReprocess={false}
              />
            ) : (
              <SourceActions
                source={source}
                isScoped={false}
                onToggleScope={onToggleScope}
                onReprocess={async () => {}}
                onDelete={onDelete}
                disabled={disabled || isLoading}
                showReprocess={false}
              />
            )}
          </div>

          {expanded && pages.length > 0 ? (
            <ul className="mt-1.5 space-y-0.5 border-t pt-1">
              {pages.map((page) => {
                const pageScoped = scopedDocumentId === page.id;
                const label = page.title?.trim() || page.path || page.url || "Page";

                return (
                  <li key={page.id}>
                    <button
                      type="button"
                      disabled={page.status !== "ready" || disabled}
                      onClick={() => onScopePage(page.id)}
                      aria-pressed={pageScoped}
                      className={cn(
                        "flex w-full min-w-0 items-center rounded px-1 py-0.5 text-left text-[10px] leading-snug",
                        pageScoped
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span className="truncate" title={label}>
                        {label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {source.status === "error" && source.error_message ? (
            <p className="text-destructive mt-1 line-clamp-3 text-[10px] leading-snug" role="alert">
              {source.error_message}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
