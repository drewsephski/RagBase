"use client";

import { useEffect, useRef, useState } from "react";
import type { Source, StarterQuestion } from "@/lib/domain/definitions";
import type { WorkspaceHeaders } from "@/lib/api/types";
import { apiJson } from "@/lib/api/client";
import { trackEvent } from "@/lib/analytics/track";
import { parseCrawlMetadata } from "@/lib/ingestion/crawl/types";

interface StartersResponse {
  starters: StarterQuestion[];
}

function findReadyCrawlSource(sources: Source[]): Source | null {
  for (const source of sources) {
    const crawlMeta = parseCrawlMetadata(
      source.metadata as Record<string, unknown> | null,
    );

    if (!crawlMeta || source.status !== "ready" || crawlMeta.pageCount === 0) {
      continue;
    }

    return source;
  }

  return null;
}

export function usePostCrawlStarters(
  sources: Source[],
  workspaceHeaders: WorkspaceHeaders | null,
  messagesCount: number,
): string[] | null {
  const [prompts, setPrompts] = useState<string[] | null>(null);
  const trackedSourceIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (messagesCount > 0 || !workspaceHeaders) {
      return;
    }

    const crawlSource = findReadyCrawlSource(sources);
    if (!crawlSource) {
      setPrompts(null);
      return;
    }

    if (trackedSourceIdsRef.current.has(crawlSource.id)) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const data = await apiJson<StartersResponse>(
          `/api/sources/${crawlSource.id}/starters`,
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

        trackedSourceIdsRef.current.add(crawlSource.id);
        setPrompts(questions);
        trackEvent("post_crawl_first_question_suggested", {
          source_id: crawlSource.id,
          starter_count: questions.length,
          page_count:
            parseCrawlMetadata(
              crawlSource.metadata as Record<string, unknown> | null,
            )?.pageCount ?? 0,
        });
      } catch {
        // Starter generation is optional; fall back to default prompts.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messagesCount, sources, workspaceHeaders]);

  return prompts;
}
