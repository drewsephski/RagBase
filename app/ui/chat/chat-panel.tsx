"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useChat } from "ai/react";
import type { Source, StarterQuestion } from "@/app/lib/definitions";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { apiJson } from "@/lib/api/client";
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
  const [starters, setStarters] = useState<StarterQuestion[]>([]);
  const [isLoadingStarters, setIsLoadingStarters] = useState(false);

  const readySources = useMemo(
    () => sources.filter((source) => source.status === "ready"),
    [sources],
  );

  const activeSourceId = scopedSourceId ?? readySources[0]?.id ?? null;

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
    if (!workspaceHeaders || !activeSourceId) {
      setStarters([]);
      return;
    }

    let cancelled = false;

    async function loadStarters() {
      setIsLoadingStarters(true);

      try {
        const data = await apiJson<StartersResponse>(
          `/api/sources/${activeSourceId}/starters`,
          { workspaceHeaders },
        );

        if (!cancelled) {
          setStarters(data.starters);
        }
      } catch {
        if (!cancelled) {
          setStarters([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStarters(false);
        }
      }
    }

    void loadStarters();

    return () => {
      cancelled = true;
    };
  }, [activeSourceId, workspaceHeaders]);

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
          <div className="border-b px-4 py-3">
            <RagBaseLogo markSize={24} />
            {scopedSourceId ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Answers use only the selected document.
              </p>
            ) : (
              <p className="text-muted-foreground mt-2 text-xs">
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
