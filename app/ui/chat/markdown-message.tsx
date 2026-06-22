"use client";

import {
  linkifyCitationMarkers,
  parseCitationLinkHref,
} from "@/lib/chat/citation-markdown";
import type { ParsedMessageCitation } from "@/lib/chat/parse-message";
import { MarkdownContent } from "@/components/markdown-content";
import { CitationBadge } from "@/app/ui/chat/citation-badge";

interface MarkdownMessageProps {
  content: string;
  citations: ParsedMessageCitation[];
  onCitationClick: (citation: ParsedMessageCitation) => void;
  className?: string;
}

export function MarkdownMessage({
  content,
  citations,
  onCitationClick,
  className,
}: MarkdownMessageProps) {
  return (
    <MarkdownContent
      content={linkifyCitationMarkers(content)}
      className={className}
      components={{
        a: ({ href, children }) => {
          const citationRef = parseCitationLinkHref(href);

          if (citationRef !== null) {
            const citation = citations.find((item) => item.ref === citationRef);

            if (citation) {
              return (
                <CitationBadge citation={citation} onClick={onCitationClick} />
              );
            }

            return <span>[{citationRef}]</span>;
          }

          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {children}
            </a>
          );
        },
      }}
    />
  );
}
