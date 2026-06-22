"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LANDING_PROMPT_CHIPS } from "@/lib/chat/starter-prompts";
import { trackEvent } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";

export const DEFAULT_PROMPT_CHIPS = LANDING_PROMPT_CHIPS;

interface PromptChipsProps {
  prompts?: readonly string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
  columns?: 1 | 2;
}

export function PromptChips({
  prompts = DEFAULT_PROMPT_CHIPS,
  onSelect,
  disabled = false,
  label = "Try asking:",
  hint,
  columns = 1,
}: PromptChipsProps) {
  const reduceMotion = useReducedMotion();
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const useGrid = columns === 2;

  const hintTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

  const cardTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 460, damping: 34 };

  function handleSelect(prompt: string, promptIndex: number) {
    trackEvent("starter_prompt_clicked", { prompt_index: promptIndex });
    setSelectedPrompt(prompt);
    onSelect(prompt);
  }

  return (
    <section aria-label="Example questions" className="space-y-2 text-left">
      <p className="text-muted-foreground text-sm">{label}</p>

      <AnimatePresence initial={false}>
        {hint ? (
          <motion.p
            key={hint}
            initial={reduceMotion ? false : { height: 0, opacity: 0, y: -4 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0, y: -4 }}
            transition={hintTransition}
            className="text-muted-foreground overflow-hidden text-xs leading-relaxed"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <div
        className={cn(
          useGrid
            ? "grid grid-cols-1 gap-2 sm:grid-cols-2"
            : "flex flex-wrap gap-1.5 sm:gap-2",
        )}
      >
        {prompts.map((prompt, promptIndex) => {
          const isSelected = selectedPrompt === prompt;

          return (
            <motion.div
              key={prompt}
              layout={!reduceMotion}
              transition={cardTransition}
              className={useGrid ? "min-w-0" : undefined}
            >
              <Button
                type="button"
                variant="outline"
                size={useGrid ? "default" : "sm"}
                disabled={disabled}
                onClick={() => handleSelect(prompt, promptIndex)}
                aria-pressed={isSelected}
                aria-label={`Example question: ${prompt}`}
                className={cn(
                  "h-auto whitespace-normal text-left transition-[border-color,background-color,box-shadow]",
                  useGrid
                    ? "w-full justify-start px-3 py-2.5 text-xs sm:text-sm"
                    : "max-w-full px-2.5 py-1.5 text-[11px] sm:px-3 sm:py-2 sm:text-sm",
                  isSelected &&
                    "border-primary/50 bg-primary/5 ring-primary/20 shadow-sm ring-1",
                )}
              >
                {prompt}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
