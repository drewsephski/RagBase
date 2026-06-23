"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProWorkspaceBadgeProps {
  className?: string;
}

export function ProWorkspaceBadge({ className }: ProWorkspaceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-amber-200/90 uppercase",
        className,
      )}
      aria-label="RagBase Pro workspace"
    >
      <Sparkles className="size-2.5 text-amber-400/90" aria-hidden />
      Pro
    </span>
  );
}
