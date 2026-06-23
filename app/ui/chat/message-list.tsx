"use client";

import { useMemo, useState } from "react";
import type { Message } from "ai/react";
import { Check, Copy } from "lucide-react";
import {
  getDisplayContent,
  parseMessageCitations,
  type ParsedMessageCitation,
} from "@/lib/chat/parse-message";
import {
  buildAnswerAnalyticsProperties,
  getAnswerLengthBucket,
} from "@/lib/analytics/answer-quality";
import { trackEvent } from "@/lib/analytics/track";
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
  model?: string;
}

function ThinkingIndicator() {
  return (
    <div
      className="flex items-center gap-2.5 px-1 py-1"
      aria-live="polite"
      aria-busy="true"
      aria-label="Generating answer"
    >
      <div className="flex items-center gap-1" aria-hidden>
        <span className="thinking-dot bg-muted-foreground/60 size-1.5 rounded-full" />
        <span className="thinking-dot bg-muted-foreground/60 size-1.5 rounded-full" />
        <span className="thinking-dot bg-muted-foreground/60 size-1.5 rounded-full" />
      </div>
      <span className="text-muted-foreground text-[13px] tracking-wide">
        Reading your documents…
      </span>
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
  onCitationClick: (citation: ParsedMessageCitation) => void;
  onCopyAnswer: (content: string) => void;
  showFeedback: boolean;
  sourceCount: number;
  workspaceId?: string;
  model?: string;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const citations = useMemo(
    () => (isUser ? [] : parseMessageCitations(message.content)),
    [isUser, message.content],
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
          "flex flex-col gap-1.5",
          isUser
            ? "max-w-[min(88%,22rem)] sm:max-w-[75%]"
            : "max-w-[min(92%,36rem)] sm:max-w-[85%]",
        )}
      >
        <div
          className={cn(
            "px-3.5 py-2.5 text-[15px] leading-[1.65] sm:px-4 sm:py-3 sm:text-[15px]",
            isUser
              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md shadow-sm"
              : "bg-card/70 text-foreground border-border/60 rounded-2xl rounded-bl-md border shadow-sm backdrop-blur-sm",
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
                className="text-muted-foreground hover:text-foreground h-7 gap-1.5 px-2 text-xs"
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
  model,
}: MessageListProps) {
  const [activeCitation, setActiveCitation] =
    useState<ParsedMessageCitation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  function handleCitationClick(citation: ParsedMessageCitation) {
    trackEvent("citation_clicked", {
      citation_ref: citation.ref,
    });
    trackEvent("source_opened", {
      citation_ref: citation.ref,
    });
    setActiveCitation(citation);
    setDrawerOpen(true);
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
      <ScrollArea className="min-h-0 flex-1 px-3 py-4 sm:px-5 sm:py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:gap-5">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center text-sm">
              Ask a question to get started. Answers include quotes from your
              documents.
            </p>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onCitationClick={handleCitationClick}
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
        onOpenChange={handleDrawerOpenChange}
      />
    </>
  );
}
