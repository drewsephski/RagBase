"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Source } from "@/lib/domain/definitions";
import { apiFetch, apiJson, ApiError } from "@/lib/api/client";
import type { WorkspaceHeaders } from "@/lib/api/types";
import { trackEvent } from "@/lib/analytics/track";
import { getSourceIngestionFailure } from "@/lib/ingestion/user-errors";
import { getOpenRouterKey } from "@/lib/openrouter/client-key";

interface SourcesResponse {
  sources: Source[];
}

const POLL_INTERVAL_MS = 2000;

interface UseSourcesOptions {
  headers: WorkspaceHeaders | null;
  activeWorkspaceId: string | null;
  isReady: boolean;
}

export function useSources({
  headers,
  activeWorkspaceId,
  isReady,
}: UseSourcesOptions) {
  const [sources, setSources] = useState<Source[]>([]);
  const [hasLoadedSources, setHasLoadedSources] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [scopedSourceId, setScopedSourceId] = useState<string | null>(null);
  const [scopedDocumentId, setScopedDocumentId] = useState<string | null>(null);
  const trackedErrorSourceIdsRef = useRef<Set<string>>(new Set());

  const fetchSources = useCallback(async () => {
    if (!headers) {
      return;
    }

    try {
      const data = await apiJson<SourcesResponse>("/api/sources", {
        workspaceHeaders: headers,
      });
      setSources(data.sources);

      for (const source of data.sources) {
        if (
          source.status === "error" &&
          !trackedErrorSourceIdsRef.current.has(source.id)
        ) {
          trackedErrorSourceIdsRef.current.add(source.id);
          const failure = getSourceIngestionFailure(source);
          trackEvent("ingestion_failed", {
            source_type: source.type,
            ...(failure ? { error_category: failure.category } : {}),
          });
        }
      }

      setError(null);
    } catch (fetchError) {
      setSources([]);
      setError(
        fetchError instanceof ApiError
          ? fetchError.message
          : "Could not load your documents.",
      );
    } finally {
      setHasLoadedSources(true);
    }
  }, [headers]);

  useEffect(() => {
    if (!isReady || !headers || !activeWorkspaceId) {
      return;
    }

    setSources([]);
    setHasLoadedSources(false);
    setScopedSourceId(null);
    setScopedDocumentId(null);
    setError(null);
    trackedErrorSourceIdsRef.current = new Set();
    void fetchSources();
  }, [activeWorkspaceId, fetchSources, headers, isReady, refreshToken]);

  useEffect(() => {
    const hasPending = sources.some(
      (source) =>
        source.status === "pending" || source.status === "processing",
    );

    if (!hasPending || !headers) {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchSources();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [fetchSources, headers, sources]);

  const bumpRefresh = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  const refresh = useCallback(async () => {
    await fetchSources();
  }, [fetchSources]);

  const resetSources = useCallback(() => {
    setSources([]);
    setHasLoadedSources(false);
    setScopedSourceId(null);
    setScopedDocumentId(null);
    setError(null);
  }, []);

  const deleteSource = useCallback(
    async (sourceId: string) => {
      if (!headers) {
        return;
      }

      await apiJson(`/api/sources/${sourceId}`, {
        method: "DELETE",
        workspaceHeaders: headers,
      });

      if (scopedSourceId === sourceId) {
        setScopedSourceId(null);
        setScopedDocumentId(null);
      }

      await fetchSources();
    },
    [fetchSources, headers, scopedSourceId],
  );

  const reprocessSource = useCallback(
    async (sourceId: string) => {
      if (!headers) {
        return;
      }

      const openRouterKey = getOpenRouterKey();

      await apiFetch(`/api/sources/${sourceId}/reprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(openRouterKey ? { openRouterKey } : {}),
        workspaceHeaders: headers,
      });

      await fetchSources();
    },
    [fetchSources, headers],
  );

  const toggleScope = useCallback((sourceId: string) => {
    setScopedSourceId((current) => {
      if (current === sourceId) {
        setScopedDocumentId(null);
        return null;
      }
      setScopedDocumentId(null);
      return sourceId;
    });
  }, []);

  const scopePage = useCallback((sourceId: string, documentId: string) => {
    setScopedSourceId(sourceId);
    setScopedDocumentId((current) =>
      current === documentId ? null : documentId,
    );
  }, []);

  const cancelCrawl = useCallback(
    async (sourceId: string) => {
      if (!headers) {
        return;
      }

      await apiJson(`/api/sources/${sourceId}/crawl/cancel`, {
        method: "POST",
        workspaceHeaders: headers,
      });

      await fetchSources();
    },
    [fetchSources, headers],
  );

  const showAppShell = hasLoadedSources && sources.length > 0;

  const readySources = useMemo(
    () => sources.filter((source) => source.status === "ready"),
    [sources],
  );

  const hasPending = useMemo(
    () =>
      sources.some(
        (source) =>
          source.status === "pending" || source.status === "processing",
      ),
    [sources],
  );

  return {
    sources,
    hasLoadedSources,
    isLoading: !hasLoadedSources,
    error,
    refreshToken,
    scopedSourceId,
    scopedDocumentId,
    setScopedSourceId,
    showAppShell,
    readySources,
    hasPending,
    refresh,
    bumpRefresh,
    resetSources,
    deleteSource,
    reprocessSource,
    toggleScope,
    scopePage,
    cancelCrawl,
  };
}
