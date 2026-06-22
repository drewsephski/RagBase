"use client";

import { useCallback, useEffect, useState } from "react";
import type { Source } from "@/app/lib/definitions";
import { LIMITS } from "@/app/lib/definitions";
import { apiFetch, apiJson, ApiError } from "@/lib/api/client";
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
      <p className="text-muted-foreground text-sm" aria-live="polite">
        Loading your documents…
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {error}
      </p>
    );
  }

  if (sources.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No documents yet. Upload a file or paste a link to get started.
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Your documents</h2>
        <span className="text-muted-foreground text-xs">
          {sources.length}/{LIMITS.MAX_SOURCES}
        </span>
      </div>

      <ScrollArea className="min-h-0 flex-1 pr-3">
        <ul className="space-y-2 pb-2">
          {sources.map((source) => (
            <li key={source.id}>
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
