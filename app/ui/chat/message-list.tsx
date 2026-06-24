"use client";

import { useMemo, useState } from "react";
import type { Message } from "ai/react";
import { Check, Copy } from "lucide-react";
import {
  getDisplayContent,
  getMessageDisplayCitations,
  isFallbackCitation,
  type DisplayCitation,
} from "@/lib/chat/citations";
import { getUiMessageCitations, storedMessageToUiMessage } from "@/lib/chat/messages";
import {
  buildAnswerAnalyticsProperties,
  getAnswerLengthBucket,
} from "@/lib/analytics/answer-quality";
import { trackEvent } from "@/lib/analytics/track";
import { apiJson } from "@/lib/api/client";
import type { Message as StoredMessage } from "@/lib/domain/definitions";
import type { WorkspaceHeaders } from "@/lib/api/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnswerFeedback } from "@/app/ui/chat/answer-feedback";
import { CitationDrawer } from "@/app/ui/chat/citation-drawer";
import { MarkdownMessage } from "@/app/ui/chat/markdown-message";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  sourceCount?: number;
  workspaceId?: string;
  workspaceHeaders?: WorkspaceHeaders | null;
  model?: string;
}

interface MessagesResponse {
  messages: StoredMessage[];
}

function getLatestStoredAssistantMessage(
  messages: StoredMessage[],
): StoredMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "assistant") {
      return message;
    }
  }

  return null;
}

function resolveCitationFromStoredMessages(
  storedMessages: StoredMessage[],
  message: Message,
  citationRef: number,
): DisplayCitation | null {
  const matchingMessage =
    storedMessages.find(
      (storedMessage) =>
        storedMessage.id === message.id && storedMessage.role === "assistant",
    ) ?? getLatestStoredAssistantMessage(storedMessages);

  if (!matchingMessage) {
    return null;
  }

  const uiMessage = storedMessageToUiMessage(matchingMessage);

  return (
    getMessageDisplayCitations(
      uiMessage.content,
      getUiMessageCitations(uiMessage),
    ).find((item) => item.ref === citationRef) ?? null
  );
}

function ThinkingIndicator() {
  return (
    <div
      className="flex justify-start px-0.5 py-1"
      aria-live="polite"
      aria-busy="true"
      aria-label="Generating answer"
    >
      <div className="chat-thinking-pill inline-flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-1" aria-hidden>
          <span className="thinking-dot bg-muted-foreground/70 size-1.5 rounded-full" />
          <span className="thinking-dot bg-muted-foreground/70 size-1.5 rounded-full" />
          <span className="thinking-dot bg-muted-foreground/70 size-1.5 rounded-full" />
        </div>
        <span className="text-muted-foreground text-[13px] tracking-wide">
          Reading your documents…
        </span>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onCitationClick,
  onCopyAnswer,
  showFeedback,
  sourceCount,
  workspaceId,
  model,
}: {
  message: Message;
  onCitationClick: (citation: DisplayCitation) => void;
  onCopyAnswer: (content: string) => void;
  showFeedback: boolean;
  sourceCount: number;
  workspaceId?: string;
  model?: string;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const citations = useMemo(
    () =>
      isUser
        ? []
        : getMessageDisplayCitations(
            message.content,
            getUiMessageCitations(message),
          ),
    [isUser, message.annotations, message.content, message.data],
  );
  const displayContent = isUser ? message.content : getDisplayContent(message.content);

  async function handleCopyClick() {
    try {
      await navigator.clipboard.writeText(displayContent);
      setCopied(true);
      onCopyAnswer(message.content);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access may be blocked; analytics still should not block UX.
    }
  }

  return (
    <div
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
      aria-label={isUser ? "Your message" : "Assistant message"}
    >
      <div
        className={cn(
          "flex flex-col gap-2",
          isUser
            ? "max-w-[min(88%,22rem)] sm:max-w-[75%]"
            : "max-w-[min(92%,36rem)] sm:max-w-[85%]",
        )}
      >
        {!isUser ? (
          <span className="text-muted-foreground px-1 text-[10px] font-medium tracking-widest uppercase">
            Answer
          </span>
        ) : null}

        <div
          className={cn(
            "px-3.5 py-2.5 text-[15px] leading-[1.65] sm:px-4 sm:py-3 sm:text-[15px]",
            isUser
              ? "chat-message-user bg-primary text-primary-foreground rounded-2xl rounded-br-md"
              : "chat-message-assistant text-foreground rounded-2xl rounded-bl-md",
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <MarkdownMessage
              content={displayContent}
              citations={citations}
              onCitationClick={onCitationClick}
            />
          )}
        </div>

        {!isUser ? (
          <div className="flex flex-col gap-2 px-0.5">
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void handleCopyClick()}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-7 gap-1.5 rounded-lg px-2 text-xs"
                aria-label={copied ? "Answer copied" : "Copy answer"}
              >
                {copied ? (
                  <Check className="size-3" aria-hidden />
                ) : (
                  <Copy className="size-3" aria-hidden />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            {showFeedback ? (
              <AnswerFeedback
                sourceCount={sourceCount}
                workspaceId={workspaceId}
                model={model}
                citationCount={citations.length}
                hasCitations={citations.length > 0}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  isLoading = false,
  sourceCount = 0,
  workspaceId,
  workspaceHeaders = null,
  model,
}: MessageListProps) {
  const [activeCitation, setActiveCitation] =
    useState<DisplayCitation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isResolvingCitation, setIsResolvingCitation] = useState(false);

  const lastAssistantMessageId = useMemo(() => {
    if (isLoading) {
      return null;
    }

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "assistant") {
        return messages[index]?.id ?? null;
      }
    }

    return null;
  }, [isLoading, messages]);

  async function handleCitationClick(
    citation: DisplayCitation,
    message: Message,
  ) {
    trackEvent("citation_clicked", {
      citation_ref: citation.ref,
    });
    trackEvent("source_opened", {
      citation_ref: citation.ref,
    });
    setActiveCitation(citation);
    setDrawerOpen(true);

    if (!isFallbackCitation(citation)) {
      return;
    }

    const resolvedFromMessage = getMessageDisplayCitations(
      message.content,
      getUiMessageCitations(message),
    ).find((item) => item.ref === citation.ref);

    if (resolvedFromMessage && !isFallbackCitation(resolvedFromMessage)) {
      setActiveCitation(resolvedFromMessage);
      return;
    }

    if (!workspaceHeaders) {
      return;
    }

    setIsResolvingCitation(true);

    try {
      const data = await apiJson<MessagesResponse>("/api/messages", {
        workspaceHeaders,
      });
      const resolved = resolveCitationFromStoredMessages(
        data.messages,
        message,
        citation.ref,
      );

      if (resolved && !isFallbackCitation(resolved)) {
        setActiveCitation(resolved);
      }
    } finally {
      setIsResolvingCitation(false);
    }
  }

  function handleDrawerOpenChange(open: boolean) {
    setDrawerOpen(open);

    if (!open) {
      setActiveCitation(null);
    }
  }

  function handleCopyAnswer(content: string) {
    const displayContent = getDisplayContent(content);
    trackEvent(
      "copy_answer_clicked",
      buildAnswerAnalyticsProperties(
        { sourceCount, workspaceId, model },
        {
          answer_length_bucket: getAnswerLengthBucket(displayContent.length),
        },
      ),
    );
  }

  return (
    <>
      <ScrollArea className="chat-thread min-h-0 flex-1 px-3 py-4 sm:px-5 sm:py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 sm:gap-6">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center text-sm leading-relaxed">
              Ask a question to get started. Answers include quotes from your
              documents.
            </p>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onCitationClick={(selectedCitation) =>
                  void handleCitationClick(selectedCitation, message)
                }
                onCopyAnswer={handleCopyAnswer}
                showFeedback={message.id === lastAssistantMessageId}
                sourceCount={sourceCount}
                workspaceId={workspaceId}
                model={model}
              />
            ))
          )}

          {isLoading ? <ThinkingIndicator /> : null}
        </div>
      </ScrollArea>

      <CitationDrawer
        citation={activeCitation}
        open={drawerOpen}
        isLoading={isResolvingCitation}
        onOpenChange={handleDrawerOpenChange}
      />
    </>
  );
}
