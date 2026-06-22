"use client";

import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  linkifyCitationMarkers,
  parseCitationLinkHref,
} from "@/lib/chat/citation-markdown";
import type { ParsedMessageCitation } from "@/lib/chat/parse-message";
import { cn } from "@/lib/utils";
import { CitationBadge } from "@/app/ui/chat/citation-badge";

interface MarkdownMessageProps {
  content: string;
  citations: ParsedMessageCitation[];
  onCitationClick: (citation: ParsedMessageCitation) => void;
  className?: string;
}

function createMarkdownComponents(
  citations: ParsedMessageCitation[],
  onCitationClick: (citation: ParsedMessageCitation) => void,
): Components {
  return {
    p: ({ children }) => (
      <p className="mb-2 last:mb-0 [&:not(:first-child)]:mt-2">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    h1: ({ children }) => (
      <h1 className="mb-2 text-lg font-semibold last:mb-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-2 text-base font-semibold last:mb-0">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 text-sm font-semibold last:mb-0">{children}</h3>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    blockquote: ({ children }) => (
      <blockquote className="border-border text-muted-foreground mb-2 border-l-2 pl-3 last:mb-0">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="border-border my-3" />,
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
    code: ({ className, children }) => {
      const isBlock = Boolean(className?.includes("language-"));

      if (isBlock) {
        return (
          <code className={cn("font-mono text-[0.9em]", className)}>
            {children}
          </code>
        );
      }

      return (
        <code className="bg-background/60 rounded px-1 py-0.5 font-mono text-[0.9em]">
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="bg-background/60 mb-2 overflow-x-auto rounded-lg p-3 text-sm last:mb-0">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="mb-2 overflow-x-auto last:mb-0">
        <table className="border-border w-full border-collapse text-sm">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border-border border px-2 py-1 text-left font-semibold">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-border border px-2 py-1 align-top">{children}</td>
    ),
  };
}

export function MarkdownMessage({
  content,
  citations,
  onCitationClick,
  className,
}: MarkdownMessageProps) {
  const markdown = linkifyCitationMarkers(content);
  const components = createMarkdownComponents(citations, onCitationClick);

  return (
    <div className={cn("markdown-message leading-relaxed", className)}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}
