"use client";

import { Button } from "@/components/ui/button";

const EXAMPLE_PROMPTS = [
  "Summarize this in plain English",
  "What are the key dates and deadlines?",
  "Find anything about cancellation or termination",
  "What do I need to do next?",
] as const;

interface PromptChipsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function PromptChips({ onSelect, disabled = false }: PromptChipsProps) {
  return (
    <section aria-label="Example questions" className="space-y-2">
      <p className="text-muted-foreground text-sm">Try asking:</p>
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            aria-label={`Example question: ${prompt}`}
            className="h-auto whitespace-normal px-3 py-2 text-left text-xs sm:text-sm"
          >
            {prompt}
          </Button>
        ))}
      </div>
    </section>
  );
}
