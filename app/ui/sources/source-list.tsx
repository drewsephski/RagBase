"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Source } from "@/app/lib/definitions";
import { LIMITS } from "@/app/lib/definitions";
import { apiFetch, apiJson, ApiError } from "@/lib/api/client";
import { trackEvent } from "@/lib/analytics/track";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SourceItem } from "@/app/ui/sources/source-item";

interface SourceListProps {
  workspaceHeaders: WorkspaceHeaders | null;
  scopedSourceId: string | null;
  onScopedSourceChange: (sourceId: string | null) => void;
  refreshToken?: number;
  onSourcesChange?: (sources: Source[]) => void;
}

interface SourcesResponse {
  sources: Source[];
}

const POLL_INTERVAL_MS = 2000;

export function SourceList({
  workspaceHeaders,
  scopedSourceId,
  onScopedSourceChange,
  refreshToken = 0,
  onSourcesChange,
}: SourceListProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trackedErrorSourceIdsRef = useRef<Set<string>>(new Set());

  const fetchSources = useCallback(async () => {
    if (!workspaceHeaders) {
      return;
    }

    try {
      const data = await apiJson<SourcesResponse>("/api/sources", {
        workspaceHeaders,
      });
      setSources(data.sources);
      onSourcesChange?.(data.sources);

      for (const source of data.sources) {
        if (
          source.status === "error" &&
          !trackedErrorSourceIdsRef.current.has(source.id)
        ) {
          trackedErrorSourceIdsRef.current.add(source.id);
          trackEvent("ingestion_failed", {
            source_type: source.type,
          });
        }
      }

      setError(null);
    } catch (fetchError) {
      setError(
        fetchError instanceof ApiError
          ? fetchError.message
          : "Could not load your documents.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [onSourcesChange, workspaceHeaders]);

  useEffect(() => {
    void fetchSources();
  }, [fetchSources, refreshToken]);

  useEffect(() => {
    const hasPending = sources.some(
      (source) =>
        source.status === "pending" || source.status === "processing",
    );

    if (!hasPending || !workspaceHeaders) {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchSources();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [fetchSources, sources, workspaceHeaders]);

  async function handleDelete(sourceId: string) {
    if (!workspaceHeaders) {
      return;
    }

    await apiJson(`/api/sources/${sourceId}`, {
      method: "DELETE",
      workspaceHeaders,
    });

    if (scopedSourceId === sourceId) {
      onScopedSourceChange(null);
    }

    await fetchSources();
  }

  async function handleReprocess(sourceId: string) {
    if (!workspaceHeaders) {
      return;
    }

    await apiFetch(`/api/sources/${sourceId}/reprocess`, {
      method: "POST",
      workspaceHeaders,
    });

    await fetchSources();
  }

  function handleToggleScope(sourceId: string) {
    onScopedSourceChange(scopedSourceId === sourceId ? null : sourceId);
  }

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
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
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
                onToggleScope={() => handleToggleScope(source.id)}
                onReprocess={() => handleReprocess(source.id)}
                onDelete={() => handleDelete(source.id)}
              />
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
