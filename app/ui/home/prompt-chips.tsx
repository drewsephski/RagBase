"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Link2 } from "lucide-react";
import { useCallback, useState } from "react";
import type { TemplateId } from "@/app/lib/templates";
import { Button } from "@/components/ui/button";
import { LANDING_PROMPT_CHIPS } from "@/lib/chat/starter-prompts";
import { trackEvent } from "@/lib/analytics/track";
import { buildAbsolutePromptAppUrl } from "@/lib/templates/prompt-link";
import { cn } from "@/lib/utils";

export const DEFAULT_PROMPT_CHIPS = LANDING_PROMPT_CHIPS;

interface PromptChipsProps {
  prompts?: readonly string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
  columns?: 1 | 2;
  templateId?: TemplateId | null;
  enableShareLinks?: boolean;
}

export function PromptChips({
  prompts = DEFAULT_PROMPT_CHIPS,
  onSelect,
  disabled = false,
  label = "Try asking:",
  hint,
  columns = 1,
  templateId = null,
  enableShareLinks = false,
}: PromptChipsProps) {
  const reduceMotion = useReducedMotion();
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
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

  const handleCopyLink = useCallback(
    async (prompt: string, promptIndex: number) => {
      const origin =
        typeof window !== "undefined" ? window.location.origin : undefined;
      const url = buildAbsolutePromptAppUrl(prompt, {
        templateId: templateId ?? undefined,
        origin,
      });

      if (!url) {
        return;
      }

      try {
        await navigator.clipboard.writeText(url);
        setCopiedPrompt(prompt);
        trackEvent("prompt_link_copied", {
          prompt_index: promptIndex,
          has_template: Boolean(templateId),
        });
        window.setTimeout(() => {
          setCopiedPrompt((current) => (current === prompt ? null : current));
        }, 2000);
      } catch {
        // Clipboard access may be blocked; sharing is optional.
      }
    },
    [templateId],
  );

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
          const isCopied = copiedPrompt === prompt;

          return (
            <motion.div
              key={prompt}
              layout={!reduceMotion}
              transition={cardTransition}
              className={cn("group/chip relative", useGrid ? "min-w-0" : undefined)}
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
                  enableShareLinks && "pr-9",
                  useGrid
                    ? "w-full justify-start px-3 py-2.5 text-xs sm:text-sm"
                    : "max-w-full px-2.5 py-1.5 text-[11px] sm:px-3 sm:py-2 sm:text-sm",
                  isSelected &&
                    "border-primary/50 bg-primary/5 ring-primary/20 shadow-sm ring-1",
                )}
              >
                {prompt}
              </Button>

              {enableShareLinks ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  onClick={() => void handleCopyLink(prompt, promptIndex)}
                  aria-label={
                    isCopied
                      ? "Copied share link for this question"
                      : `Copy share link for: ${prompt}`
                  }
                  className={cn(
                    "text-muted-foreground hover:text-foreground absolute top-1.5 right-1 size-7 opacity-70 transition-opacity sm:opacity-0 sm:group-hover/chip:opacity-100 sm:focus-visible:opacity-100",
                    useGrid && "top-2",
                  )}
                >
                  {isCopied ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <Link2 className="size-3.5" aria-hidden />
                  )}
                </Button>
              ) : null}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
