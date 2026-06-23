"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "ai/react";
import { Loader2 } from "lucide-react";
import type { Source } from "@/lib/domain/definitions";
import type { WorkspaceTemplate } from "@/lib/domain/templates";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { DOCUMENT_STARTER_PROMPTS } from "@/lib/chat/starter-prompts";
import {
  buildAnswerAnalyticsProperties,
  categorizeChatError,
  getAnswerLengthBucket,
} from "@/lib/analytics/answer-quality";
import { trackEvent } from "@/lib/analytics/track";
import { trackPaidIntent } from "@/lib/analytics/paid-intent";
import {
  getDisplayContent,
  resolveDisplayCitations,
} from "@/lib/chat/citations";
import { reconcileLatestAssistantMessage } from "@/lib/chat/reconcile-assistant";
import { getIngestionProgressMessage } from "@/lib/sources/ingestion-status";
import {
  getOpenRouterKey,
  getSelectedModel,
  hasOpenRouterKey,
} from "@/lib/openrouter/client-key";
import { consumePendingPrompt } from "@/lib/templates/pending-prompt";
import { MessageList } from "@/app/ui/chat/message-list";
import { ChatInput } from "@/app/ui/chat/chat-input";
import { ChatEmptyState } from "@/app/ui/chat/chat-empty-state";
import { PromptChips } from "@/app/ui/home/prompt-chips";
import { SafeUseNote } from "@/app/ui/templates/safe-use-note";
import { TemplateBanner } from "@/app/ui/templates/template-banner";
import { RagBaseLogo } from "@/components/brand/ragbase-logo";
import { BetaFeedbackCta } from "@/app/ui/feedback/beta-feedback-cta";
import { QualityDebugPanel } from "@/app/ui/chat/quality-debug-panel";
import { isDebugPanelEnabled } from "@/lib/env/public";
import { useChatHistory } from "@/hooks/use-chat-history";
import { usePostCrawlStarters } from "@/hooks/use-post-crawl-starters";

interface ChatPanelProps {
  workspaceHeaders: WorkspaceHeaders | null;
  sources: Source[];
  scopedSourceId: string | null;
  scopedDocumentId: string | null;
  template?: WorkspaceTemplate | null;
  onFirstAnswerComplete?: () => void;
}

function trackFirstMessage(sourceCount: number) {
  trackEvent("first_message_sent", { source_count: sourceCount });
}

export function ChatPanel({
  workspaceHeaders,
  sources,
  scopedSourceId,
  scopedDocumentId,
  template = null,
  onFirstAnswerComplete,
}: ChatPanelProps) {
  const pendingPromptSentRef = useRef(false);
  const firstMessageTrackedRef = useRef(false);
  const firstAnswerCompleteRef = useRef(false);
  const answerStartRef = useRef<number | null>(null);
  const prevIsLoadingRef = useRef(false);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [lastErrorCategory, setLastErrorCategory] = useState<string | null>(null);
  const [lastCitationCount, setLastCitationCount] = useState(0);

  const readySources = useMemo(
    () => sources.filter((source) => source.status === "ready"),
    [sources],
  );

  const chatHeaders = useMemo(() => {
    if (!workspaceHeaders) {
      return undefined;
    }

    const headers: Record<string, string> = {
      "X-Workspace-Id": workspaceHeaders["X-Workspace-Id"],
    };

    if (workspaceHeaders["X-Workspace-Secret"]) {
      headers["X-Workspace-Secret"] = workspaceHeaders["X-Workspace-Secret"];
    }

    return headers;
  }, [workspaceHeaders]);

  const workspaceId = workspaceHeaders?.["X-Workspace-Id"] ?? null;

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    append,
    error,
    setMessages,
  } = useChat({
    id: workspaceId ?? undefined,
    api: "/api/chat",
    headers: chatHeaders,
    experimental_prepareRequestBody: ({ messages: chatMessages }) => {
      const lastMessage = chatMessages[chatMessages.length - 1];
      const openRouterKey = getOpenRouterKey();

      return {
        message: lastMessage?.content ?? "",
        sourceId: scopedSourceId ?? undefined,
        documentId: scopedDocumentId ?? undefined,
        model: hasOpenRouterKey() ? getSelectedModel() : undefined,
        openRouterKey: openRouterKey ?? undefined,
      };
    },
  });

  const postCrawlPrompts = usePostCrawlStarters(
    sources,
    workspaceHeaders,
    messages.length,
  );

  const starterPrompts = postCrawlPrompts ?? [...DOCUMENT_STARTER_PROMPTS];
  const starterLabel = postCrawlPrompts
    ? "Ask across your crawled site:"
    : "Try asking:";

  const { isHistoryReady } = useChatHistory({
    workspaceHeaders,
    workspaceId,
    enabled: Boolean(workspaceHeaders),
    setMessages,
  });

  useEffect(() => {
    if (!isHistoryReady || firstAnswerCompleteRef.current) {
      return;
    }

    const hasAssistantAnswer = messages.some((message) => message.role === "assistant");
    if (hasAssistantAnswer) {
      firstAnswerCompleteRef.current = true;
      onFirstAnswerComplete?.();
    }
  }, [isHistoryReady, messages, onFirstAnswerComplete]);

  const hasAnySource = sources.length > 0;
  const hasReadySource = readySources.length > 0;
  const isChatEmpty = messages.length === 0;
  const ingestionProgress = getIngestionProgressMessage(sources);
  const failedSources = sources.filter((source) => source.status === "error");
  const chatLimitTrackedRef = useRef(false);

  const answerAnalyticsContext = useMemo(
    () =>
      buildAnswerAnalyticsProperties({
        sourceCount: sources.length,
        workspaceId: workspaceHeaders?.["X-Workspace-Id"],
        model: hasOpenRouterKey() ? getSelectedModel() : "free",
      }),
    [sources.length, workspaceHeaders],
  );

  useEffect(() => {
    if (isLoading && !prevIsLoadingRef.current) {
      answerStartRef.current = Date.now();
      trackEvent("answer_started", answerAnalyticsContext);
    }

    if (!isLoading && prevIsLoadingRef.current) {
      const latencyMs =
        answerStartRef.current === null
          ? undefined
          : Date.now() - answerStartRef.current;

      if (error) {
        const errorCategory = categorizeChatError(error.message);
        setLastLatencyMs(latencyMs ?? null);
        setLastErrorCategory(errorCategory);
        trackEvent("answer_failed", {
          ...answerAnalyticsContext,
          latency_ms: latencyMs ?? 0,
          error_category: errorCategory,
        });
      } else {
        const lastAssistantMessage = [...messages]
          .reverse()
          .find((message) => message.role === "assistant");

        if (lastAssistantMessage) {
          const citations = resolveDisplayCitations(
            lastAssistantMessage.content,
          );
          const displayContent = getDisplayContent(lastAssistantMessage.content);

          setLastLatencyMs(latencyMs ?? null);
          setLastErrorCategory(null);
          setLastCitationCount(citations.length);

          trackEvent("answer_completed", {
            ...answerAnalyticsContext,
            latency_ms: latencyMs ?? 0,
            citation_count: citations.length,
            has_citations: citations.length > 0,
            answer_length_bucket: getAnswerLengthBucket(displayContent.length),
          });

          if (!firstAnswerCompleteRef.current) {
            firstAnswerCompleteRef.current = true;
            onFirstAnswerComplete?.();
          }
        }

        if (workspaceHeaders) {
          void reconcileLatestAssistantMessage(workspaceHeaders, messages).then(
            (reconciledMessages) => {
              if (reconciledMessages) {
                setMessages(reconciledMessages);
              }
            },
          );
        }
      }

      answerStartRef.current = null;
    }

    prevIsLoadingRef.current = isLoading;
  }, [
    answerAnalyticsContext,
    error,
    isLoading,
    messages,
    onFirstAnswerComplete,
    setMessages,
    workspaceHeaders,
  ]);

  useEffect(() => {
    if (!error || chatLimitTrackedRef.current) {
      return;
    }

    if (/limit reached|too many messages|429/i.test(error.message)) {
      chatLimitTrackedRef.current = true;
      trackPaidIntent("larger_limits", { surface: "chat_error" });
    }
  }, [error]);

  useEffect(() => {
    if (!hasReadySource || messages.length > 0 || pendingPromptSentRef.current) {
      return;
    }

    const pendingPrompt = consumePendingPrompt();
    if (!pendingPrompt) {
      return;
    }

    pendingPromptSentRef.current = true;

    if (!firstMessageTrackedRef.current) {
      firstMessageTrackedRef.current = true;
      trackFirstMessage(sources.length);
    }

    void append({ role: "user", content: pendingPrompt });
  }, [append, hasReadySource, messages.length, sources.length]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!firstMessageTrackedRef.current) {
        firstMessageTrackedRef.current = true;
        trackFirstMessage(sources.length);
      }

      void append({ role: "user", content: text });
    },
    [append, sources.length],
  );

  const handlePromptSelect = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  const handleFormSubmit = useCallback(() => {
    if (!input.trim() || !hasReadySource) {
      return;
    }

    if (!firstMessageTrackedRef.current) {
      firstMessageTrackedRef.current = true;
      trackFirstMessage(sources.length);
    }

    handleSubmit(undefined, {
      body: {
        sourceId: scopedSourceId ?? undefined,
        documentId: scopedDocumentId ?? undefined,
      },
    });
  }, [handleSubmit, hasReadySource, input, scopedDocumentId, scopedSourceId, sources.length]);

  const chatDisabled = !workspaceHeaders || !hasAnySource || !isHistoryReady;
  const selectedModel = hasOpenRouterKey() ? getSelectedModel() : "free";
  const showDebugPanel = isDebugPanelEnabled();

  return (
    <section
      aria-label="Chat"
      className="chat-surface flex h-full min-h-0 flex-col"
    >
      {!isHistoryReady ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <ChatEmptyState description="Loading your conversation…">
            <div
              className="text-muted-foreground flex items-center justify-center gap-2 text-sm"
              aria-live="polite"
            >
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              Loading your conversation…
            </div>
          </ChatEmptyState>
        </div>
      ) : isChatEmpty ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {!hasReadySource ? (
            <ChatEmptyState
              description={
                hasAnySource
                  ? (ingestionProgress ??
                    "Reading your document — you'll be able to ask questions in a moment.")
                  : "Add a link or file to start asking questions."
              }
            >
              {hasAnySource ? (
                <div
                  className="text-muted-foreground flex items-center justify-center gap-2 text-sm"
                  aria-live="polite"
                >
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  {ingestionProgress ?? "Reading your document…"}
                </div>
              ) : null}
              {failedSources.length > 0 ? (
                <p className="text-destructive mt-4 text-sm" role="alert">
                  {failedSources.length === 1
                    ? `Could not read “${failedSources[0]!.name}”. Check the documents panel for details.`
                    : `${failedSources.length} documents could not be read. Check the documents panel for details.`}
                </p>
              ) : null}
            </ChatEmptyState>
          ) : (
            <ChatEmptyState
              description={
                template
                  ? "Your documents are ready. Pick an example question or ask your own."
                  : "Your document is ready. Pick a starter question or ask your own."
              }
            >
              {template ? (
                <div className="space-y-4 text-left sm:space-y-5">
                  <TemplateBanner template={template} />
                  <SafeUseNote safeUse={template.safeUse} />
                  <PromptChips
                    prompts={template.promptChips}
                    onSelect={handlePromptSelect}
                    disabled={isLoading}
                    columns={2}
                    label="Example questions:"
                  />
                </div>
              ) : (
                <PromptChips
                  prompts={starterPrompts}
                  onSelect={handlePromptSelect}
                  disabled={isLoading}
                  columns={2}
                  label={starterLabel}
                />
              )}
            </ChatEmptyState>
          )}
        </div>
      ) : (
        <>
          <div className="border-border/60 bg-surface-elevated/40 border-b px-4 py-3 backdrop-blur-sm sm:px-5 sm:py-3.5">
            <RagBaseLogo markSize={22} />
            {scopedSourceId ? (
              <p className="text-muted-foreground mt-1.5 text-xs tracking-wide sm:mt-2">
                Answers use only the selected document.
              </p>
            ) : (
              <p className="text-muted-foreground mt-1.5 text-xs tracking-wide sm:mt-2">
                Answers draw from all ready documents, with citations.
              </p>
            )}
          </div>

          <MessageList
            messages={messages}
            isLoading={isLoading}
            sourceCount={sources.length}
            workspaceId={workspaceHeaders?.["X-Workspace-Id"]}
            model={hasOpenRouterKey() ? getSelectedModel() : "free"}
          />
        </>
      )}

      {error ? (
        <p className="text-destructive px-4 pb-2 text-sm" role="alert">
          {error.message}
        </p>
      ) : null}

      <BetaFeedbackCta className="px-4 pb-2" />

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleFormSubmit}
        isLoading={isLoading}
        disabled={chatDisabled}
        sendDisabled={!hasReadySource || !isHistoryReady}
        placeholder={
          hasReadySource
            ? "Ask anything about your documents…"
            : ingestionProgress ?? "Reading your document…"
        }
      />

      {showDebugPanel ? (
        <QualityDebugPanel
          sourceCount={sources.length}
          citationCount={lastCitationCount}
          model={selectedModel}
          latencyMs={lastLatencyMs}
          lastErrorCategory={lastErrorCategory}
        />
      ) : null}
    </section>
  );
}
