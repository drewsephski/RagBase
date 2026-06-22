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
        "flex flex-1 flex-col items-center justify-center px-4 py-6 text-center sm:px-6 sm:py-10",
        className,
      )}
    >
      <RagBaseLogo layout="vertical" markSize={48} showTagline />

      <p className="text-muted-foreground mt-4 max-w-md text-sm leading-relaxed sm:mt-5">
        {description}
      </p>

      {children ? (
        <div className="mt-6 w-full max-w-lg sm:mt-8">{children}</div>
      ) : null}
    </div>
  );
}
