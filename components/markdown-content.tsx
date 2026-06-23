"use client";

import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
  size?: "sm" | "base";
  components?: Partial<Components>;
}

export function createMarkdownComponents(
  size: "sm" | "base" = "base",
  overrides: Partial<Components> = {},
): Components {
  const heading1Class =
    size === "sm" ? "text-base font-semibold" : "text-lg font-semibold";
  const heading2Class =
    size === "sm" ? "text-sm font-semibold" : "text-base font-semibold";
  const heading3Class =
    size === "sm" ? "text-sm font-semibold" : "text-sm font-semibold";

  const base: Components = {
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
      <h1 className={cn("mb-2 last:mb-0", heading1Class)}>{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className={cn("mb-2 last:mb-0", heading2Class)}>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className={cn("mb-2 last:mb-0", heading3Class)}>{children}</h3>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    blockquote: ({ children }) => (
      <blockquote className="border-border/80 text-muted-foreground mb-2 border-l-[3px] pl-3.5 last:mb-0 italic">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="border-border my-3" />,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2"
      >
        {children}
      </a>
    ),
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
        <code className="bg-muted/50 rounded-md px-1.5 py-0.5 font-mono text-[0.875em]">
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="bg-muted/40 border-border/50 mb-2 overflow-x-auto rounded-xl border p-3.5 text-sm last:mb-0">
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

  return { ...base, ...overrides };
}

export function MarkdownContent({
  content,
  className,
  size = "base",
  components: componentOverrides,
}: MarkdownContentProps) {
  const components = createMarkdownComponents(size, componentOverrides);

  return (
    <div
      className={cn(
        "markdown-content leading-relaxed",
        size === "sm" && "text-sm",
        className,
      )}
    >
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
