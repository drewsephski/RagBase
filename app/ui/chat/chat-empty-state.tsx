import type { ReactNode } from "react";
import { RagBaseLogo } from "@/components/brand/ragbase-logo";
import { cn } from "@/lib/utils";

interface ChatEmptyStateProps {
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function ChatEmptyState({
  description = "Ask anything about your documents. Every answer links back to the source.",
  children,
  className,
}: ChatEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center px-4 py-8 text-center sm:px-6 sm:py-12",
        className,
      )}
    >
      <RagBaseLogo layout="vertical" markSize={48} showTagline />

      <p className="text-muted-foreground mt-5 max-w-sm text-pretty text-sm leading-relaxed tracking-wide sm:mt-6">
        {description}
      </p>

      {children ? (
        <div className="mt-7 w-full max-w-2xl sm:mt-9">{children}</div>
      ) : null}
    </div>
  );
}
