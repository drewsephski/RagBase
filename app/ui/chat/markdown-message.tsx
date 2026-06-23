"use client";

import {
  createFallbackCitation,
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

function resolveCitation(
  citations: DisplayCitation[],
  citationRef: number,
): DisplayCitation {
  return (
    citations.find((item) => item.ref === citationRef) ??
    createFallbackCitation(citationRef)
  );
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
            const citation = resolveCitation(citations, citationRef);

            return (
              <CitationBadge citation={citation} onClick={onCitationClick} />
            );
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
