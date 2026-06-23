"use client";

import { useEffect, useRef, useState } from "react";
import type { Source, StarterQuestion } from "@/lib/domain/definitions";
import type { TemplateId } from "@/lib/domain/templates";
import type { WorkspaceHeaders } from "@/lib/api/types";
import { apiJson } from "@/lib/api/client";
import { trackEvent } from "@/lib/analytics/track";
import { parseCrawlMetadata } from "@/lib/ingestion/crawl/types";

interface StartersResponse {
  starters: StarterQuestion[];
}

export interface SourceStartersResult {
  prompts: string[] | null;
  label: string;
  isLoading: boolean;
}

function findStarterSource(
  sources: Source[],
  scopedSourceId: string | null,
): Source | null {
  if (scopedSourceId) {
    const scoped = sources.find(
      (source) => source.id === scopedSourceId && source.status === "ready",
    );
    if (scoped) {
      return scoped;
    }
  }

  const readySources = sources.filter((source) => source.status === "ready");
  if (readySources.length === 0) {
    return null;
  }

  return [...readySources].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0]!;
}

function buildStarterLabel(source: Source): string {
  const crawlMeta = parseCrawlMetadata(
    source.metadata as Record<string, unknown> | null,
  );

  if (crawlMeta && crawlMeta.pageCount > 0) {
    return "Ask across your crawled site:";
  }

  if (source.type === "url") {
    return "Try asking about this page:";
  }

  return "Try asking about this document:";
}

function buildFetchKey(sourceId: string, templateId?: TemplateId | null): string {
  return `${sourceId}:${templateId ?? "default"}`;
}

export function useSourceStarters(
  sources: Source[],
  workspaceHeaders: WorkspaceHeaders | null,
  messagesCount: number,
  scopedSourceId: string | null,
  templateId?: TemplateId | null,
): SourceStartersResult {
  const [prompts, setPrompts] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [label, setLabel] = useState("Try asking:");
  const cachedPromptsRef = useRef<Map<string, string[]>>(new Map());
  const trackedAnalyticsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (messagesCount > 0 || !workspaceHeaders || templateId) {
      setPrompts(null);
      setIsLoading(false);
      return;
    }

    const source = findStarterSource(sources, scopedSourceId);
    if (!source) {
      setPrompts(null);
      setIsLoading(false);
      setLabel("Try asking:");
      return;
    }

    const starterLabel = buildStarterLabel(source);
    setLabel(starterLabel);

    const fetchKey = buildFetchKey(source.id, templateId);
    const cached = cachedPromptsRef.current.get(fetchKey);
    if (cached) {
      setPrompts(cached);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setPrompts(null);

    void (async () => {
      try {
        const query = templateId ? `?template=${templateId}` : "";
        const data = await apiJson<StartersResponse>(
          `/api/sources/${source.id}/starters${query}`,
          { workspaceHeaders },
        );

        if (cancelled || data.starters.length === 0) {
          return;
        }

        const questions = data.starters
          .map((starter) => starter.text.trim())
          .filter((question) => question.length > 0);

        if (questions.length === 0) {
          return;
        }

        cachedPromptsRef.current.set(fetchKey, questions);
        setPrompts(questions);

        if (!trackedAnalyticsRef.current.has(fetchKey)) {
          trackedAnalyticsRef.current.add(fetchKey);

          const crawlMeta = parseCrawlMetadata(
            source.metadata as Record<string, unknown> | null,
          );

          if (crawlMeta && crawlMeta.pageCount > 0) {
            trackEvent("post_crawl_first_question_suggested", {
              source_id: source.id,
              starter_count: questions.length,
              page_count: crawlMeta.pageCount,
            });
          } else {
            trackEvent("source_starter_questions_suggested", {
              source_id: source.id,
              source_type: source.type,
              starter_count: questions.length,
            });
          }
        }
      } catch {
        // Starter generation is optional; fall back to default prompts.
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messagesCount, scopedSourceId, sources, templateId, workspaceHeaders]);

  return { prompts, label, isLoading };
}
