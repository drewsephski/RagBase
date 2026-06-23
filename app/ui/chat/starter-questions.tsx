"use client";

import type { StarterQuestion } from "@/lib/domain/definitions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface StarterQuestionsProps {
  starters: StarterQuestion[];
  isLoading?: boolean;
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export function StarterQuestions({
  starters,
  isLoading = false,
  onSelect,
  disabled = false,
}: StarterQuestionsProps) {
  if (isLoading) {
    return (
      <div
        className="text-muted-foreground flex items-center gap-2 text-sm"
        aria-live="polite"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Suggesting questions…
      </div>
    );
  }

  if (starters.length === 0) {
    return null;
  }

  return (
    <section aria-label="Suggested questions" className="space-y-2 text-left">
      <p className="text-muted-foreground text-xs sm:text-sm">Suggested questions</p>
      <div className="grid grid-cols-2 gap-2">
        {starters.map((starter) => (
          <div key={starter.id} className="space-y-1">
            {starter.sourceName ? (
              <p className="text-muted-foreground truncate px-1 text-[9px] leading-tight sm:text-[10px]">
                {starter.sourceName}
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => onSelect(starter.text)}
              className="h-auto w-full justify-start whitespace-normal px-3 py-2.5 text-left text-xs sm:text-sm"
              aria-label={`Suggested question: ${starter.text}`}
            >
              {starter.text}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
