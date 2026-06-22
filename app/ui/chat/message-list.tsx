"use client";

import { useMemo, useState } from "react";
import type { Message } from "ai/react";
import {
  getDisplayContent,
  parseMessageCitations,
  type ParsedMessageCitation,
} from "@/lib/chat/parse-message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CitationBadge } from "@/app/ui/chat/citation-badge";
import { CitationDrawer } from "@/app/ui/chat/citation-drawer";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

function renderContentWithCitations(
  content: string,
  citations: ParsedMessageCitation[],
  onCitationClick: (citation: ParsedMessageCitation) => void,
): React.ReactNode[] {
  const displayContent = getDisplayContent(content);
  const parts = displayContent.split(/(\[\d+\])/g);

  return parts.map((part, index) => {
    const match = part.match(/^\[(\d+)\]$/);

    if (!match) {
      return <span key={`text-${index}`}>{part}</span>;
    }

    const ref = Number(match[1]);
    const citation = citations.find((item) => item.ref === ref);

    if (!citation) {
      return <span key={`ref-${index}`}>{part}</span>;
    }

    return (
      <CitationBadge
        key={`cite-${citation.ref}-${index}`}
        citation={citation}
        onClick={onCitationClick}
      />
    );
  });
}

function MessageBubble({
  message,
  onCitationClick,
}: {
  message: Message;
  onCitationClick: (citation: ParsedMessageCitation) => void;
}) {
  const isUser = message.role === "user";
  const citations = useMemo(
    () => (isUser ? [] : parseMessageCitations(message.content)),
    [isUser, message.content],
  );

  return (
    <div
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
      aria-label={isUser ? "Your message" : "Assistant message"}
    >
      <div
        className={cn(
          "max-w-[min(92%,20rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[85%] sm:px-4 sm:py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/60 text-foreground",
        )}
      >
        <div className="whitespace-pre-wrap">
          {isUser
            ? message.content
            : renderContentWithCitations(
                message.content,
                citations,
                onCitationClick,
              )}
        </div>
      </div>
    </div>
  );
}

export function MessageList({ messages, isLoading = false }: MessageListProps) {
  const [activeCitation, setActiveCitation] =
    useState<ParsedMessageCitation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleCitationClick(citation: ParsedMessageCitation) {
    setActiveCitation(citation);
    setDrawerOpen(true);
  }

  return (
    <>
      <ScrollArea className="min-h-0 flex-1 px-2 py-3 sm:px-4 sm:py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:gap-4">
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
              />
            ))
          )}

          {isLoading ? (
            <p
              className="text-muted-foreground text-sm"
              aria-live="polite"
              aria-busy="true"
            >
              Thinking…
            </p>
          ) : null}
        </div>
      </ScrollArea>

      <CitationDrawer
        citation={activeCitation}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}
