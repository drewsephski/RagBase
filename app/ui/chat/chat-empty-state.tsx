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
        "relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12",
        className,
      )}
    >
      <div
        className="chat-empty-glow pointer-events-none absolute inset-0"
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        <div className="surface-premium w-full max-w-md rounded-2xl border px-6 py-7 sm:px-8 sm:py-9">
          <RagBaseLogo layout="vertical" markSize={48} showTagline />

          <p className="text-muted-foreground mt-5 text-pretty text-sm leading-relaxed tracking-wide sm:mt-6">
            {description}
          </p>
        </div>

        {children ? (
          <div className="mt-6 w-full sm:mt-8">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
