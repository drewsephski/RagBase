"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "ai/react";
import type { Source, StarterQuestion } from "@/app/lib/definitions";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { apiJson } from "@/lib/api/client";
import { STARTER_QUESTIONS_PER_SOURCE } from "@/lib/chat/starters";
import {
  getOpenRouterKey,
  getSelectedModel,
  hasOpenRouterKey,
} from "@/lib/openrouter/client-key";
import { MessageList } from "@/app/ui/chat/message-list";
import { ChatInput } from "@/app/ui/chat/chat-input";
import { StarterQuestions } from "@/app/ui/chat/starter-questions";
import { ChatEmptyState } from "@/app/ui/chat/chat-empty-state";
import { RagBaseLogo } from "@/components/brand/ragbase-logo";

interface ChatPanelProps {
  workspaceHeaders: WorkspaceHeaders | null;
  sources: Source[];
  scopedSourceId: string | null;
}

interface StartersResponse {
  starters: StarterQuestion[];
}

export function ChatPanel({
  workspaceHeaders,
  sources,
  scopedSourceId,
}: ChatPanelProps) {
  const [startersBySourceId, setStartersBySourceId] = useState<
    Record<string, StarterQuestion[]>
  >({});
  const startersBySourceIdRef = useRef(startersBySourceId);
  const loadingSourceIdsRef = useRef<Set<string>>(new Set());

  const readySources = useMemo(
    () => sources.filter((source) => source.status === "ready"),
    [sources],
  );

  const targetSources = useMemo(() => {
    if (scopedSourceId) {
      return readySources.filter((source) => source.id === scopedSourceId);
    }

    return readySources;
  }, [readySources, scopedSourceId]);

  const targetSourceIds = useMemo(
    () => targetSources.map((source) => source.id).join(","),
    [targetSources],
  );

  const showSourceNames = !scopedSourceId && targetSources.length > 1;

  const starters = useMemo(
    () =>
      targetSources.flatMap((source) =>
        (startersBySourceId[source.id] ?? []).map((starter) => ({
          ...starter,
          sourceName: showSourceNames ? source.name : undefined,
        })),
      ),
    [showSourceNames, startersBySourceId, targetSources],
  );

  const isLoadingStarters =
    targetSources.length > 0 &&
    starters.length === 0 &&
    targetSources.some((source) => !startersBySourceId[source.id]);

  useEffect(() => {
    startersBySourceIdRef.current = startersBySourceId;
  }, [startersBySourceId]);

  const chatHeaders = useMemo(() => {
    if (!workspaceHeaders) {
      return undefined;
    }

    return {
      "X-Workspace-Id": workspaceHeaders["X-Workspace-Id"],
      "X-Workspace-Secret": workspaceHeaders["X-Workspace-Secret"],
    };
  }, [workspaceHeaders]);

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    append,
    error,
  } = useChat({
    api: "/api/chat",
    headers: chatHeaders,
    experimental_prepareRequestBody: ({ messages: chatMessages }) => {
      const lastMessage = chatMessages[chatMessages.length - 1];
      const openRouterKey = getOpenRouterKey();

      return {
        message: lastMessage?.content ?? "",
        sourceId: scopedSourceId ?? undefined,
        model: hasOpenRouterKey() ? getSelectedModel() : undefined,
        openRouterKey: openRouterKey ?? undefined,
      };
    },
  });

  useEffect(() => {
    if (!workspaceHeaders || targetSources.length === 0) {
      setStartersBySourceId({});
      loadingSourceIdsRef.current = new Set();
      return;
    }

    const activeIds = new Set(targetSources.map((source) => source.id));

    setStartersBySourceId((current) => {
      const next: Record<string, StarterQuestion[]> = {};

      for (const sourceId of activeIds) {
        if (current[sourceId]) {
          next[sourceId] = current[sourceId];
        }
      }

      return next;
    });

    let cancelled = false;

    async function loadStartersForSource(source: Source) {
      if (
        startersBySourceIdRef.current[source.id] ||
        loadingSourceIdsRef.current.has(source.id)
      ) {
        return;
      }

      loadingSourceIdsRef.current.add(source.id);

      try {
        const data = await apiJson<StartersResponse>(
          `/api/sources/${source.id}/starters`,
          { workspaceHeaders },
        );

        if (cancelled) {
          return;
        }

        const normalized = data.starters
          .slice(0, STARTER_QUESTIONS_PER_SOURCE)
          .map((starter, index) => ({
            ...starter,
            id: `${source.id}-starter-${index + 1}`,
          }));

        setStartersBySourceId((current) => ({
          ...current,
          [source.id]: normalized,
        }));
      } catch {
        if (!cancelled) {
          setStartersBySourceId((current) => {
            const next = { ...current };
            delete next[source.id];
            return next;
          });
        }
      } finally {
        loadingSourceIdsRef.current.delete(source.id);
      }
    }

    for (const source of targetSources) {
      void loadStartersForSource(source);
    }

    return () => {
      cancelled = true;
    };
  }, [targetSourceIds, targetSources, workspaceHeaders]);

  const handleStarterSelect = useCallback(
    (text: string) => {
      void append({ role: "user", content: text });
    },
    [append],
  );

  const hasAnySource = sources.length > 0;
  const hasReadySource = readySources.length > 0;
  const isChatEmpty = messages.length === 0;

  const handleFormSubmit = useCallback(() => {
    if (!input.trim() || !hasReadySource) {
      return;
    }

    handleSubmit(undefined, {
      body: {
        sourceId: scopedSourceId ?? undefined,
      },
    });
  }, [handleSubmit, hasReadySource, input, scopedSourceId]);

  const chatDisabled = !workspaceHeaders || !hasAnySource;

  return (
    <section
      aria-label="Chat"
      className="flex h-full min-h-0 flex-col bg-background"
    >
      {isChatEmpty ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {!hasReadySource ? (
            <ChatEmptyState
              description={
                hasAnySource
                  ? "Reading your document… you can type while we finish indexing."
                  : "Add a link or file to start asking questions."
              }
            />
          ) : (
            <ChatEmptyState>
              <StarterQuestions
                starters={starters}
                isLoading={isLoadingStarters}
                onSelect={handleStarterSelect}
                disabled={isLoading}
              />
            </ChatEmptyState>
          )}
        </div>
      ) : (
        <>
          <div className="border-b px-3 py-2.5 sm:px-4 sm:py-3">
            <RagBaseLogo markSize={24} />
            {scopedSourceId ? (
              <p className="text-muted-foreground mt-1.5 text-xs sm:mt-2">
                Answers use only the selected document.
              </p>
            ) : (
              <p className="text-muted-foreground mt-1.5 text-xs sm:mt-2">
                Answers draw from all ready documents.
              </p>
            )}
          </div>

          <MessageList messages={messages} isLoading={isLoading} />
        </>
      )}

      {error ? (
        <p className="text-destructive px-4 pb-2 text-sm" role="alert">
          {error.message}
        </p>
      ) : null}

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleFormSubmit}
        isLoading={isLoading}
        disabled={chatDisabled}
        sendDisabled={!hasReadySource}
        placeholder={
          hasReadySource
            ? "Ask anything about your documents…"
            : "Reading your document…"
        }
      />
    </section>
  );
}
