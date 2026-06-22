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
        "flex flex-1 flex-col items-center justify-center px-6 py-10 text-center",
        className,
      )}
    >
      <RagBaseLogo layout="vertical" markSize={56} showTagline />

      <p className="text-muted-foreground mt-5 max-w-md text-sm leading-relaxed">
        {description}
      </p>

      {children ? <div className="mt-8 w-full max-w-lg">{children}</div> : null}
    </div>
  );
}
