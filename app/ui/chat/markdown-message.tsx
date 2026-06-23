"use client";

import {
  linkifyCitationMarkers,
  parseCitationLinkHref,
  type DisplayCitation,
} from "@/lib/chat/citations";
import { MarkdownContent } from "@/components/markdown-content";
import { CitationBadge } from "@/app/ui/chat/citation-badge";

interface MarkdownMessageProps {
  content: string;
  citations: DisplayCitation[];
  onCitationClick: (citation: DisplayCitation) => void;
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
