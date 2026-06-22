"use client";

import type { StarterQuestion } from "@/app/lib/definitions";
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
    <section aria-label="Suggested questions" className="space-y-2">
      <p className="text-muted-foreground text-sm">Suggested questions</p>
      <div className="flex flex-col gap-2">
        {starters.map((starter) => (
          <div key={starter.id} className="space-y-1">
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => onSelect(starter.text)}
              className="h-auto w-full justify-start whitespace-normal px-3 py-2 text-left text-sm"
              aria-label={`Suggested question: ${starter.text}`}
            >
              {starter.text}
            </Button>
            {starter.disclaimer ? (
              <p className="text-muted-foreground px-1 text-xs">
                {starter.disclaimer}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
