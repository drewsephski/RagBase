"use client";

import { useCallback } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  sendDisabled?: boolean;
  placeholder?: string;
  showHint?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  disabled = false,
  sendDisabled = false,
  placeholder = "Ask anything about your documents…",
  showHint = true,
}: ChatInputProps) {
  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!value.trim() || isLoading || disabled) {
        return;
      }
      onSubmit();
    },
    [disabled, isLoading, onSubmit, value],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (!value.trim() || isLoading || disabled) {
          return;
        }
        onSubmit();
      }
    },
    [disabled, isLoading, onSubmit, value],
  );

  const canSend = !disabled && !sendDisabled && !isLoading && value.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="px-3 pb-3 pb-safe pt-2 sm:px-5 sm:pb-5 sm:pt-3"
    >
      <div className="chat-composer mx-auto w-full max-w-3xl rounded-2xl border p-1.5 sm:p-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-input"
            rows={1}
            value={value}
            disabled={disabled || isLoading}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Ask a question"
            className={cn(
              "chat-composer-input placeholder:text-muted-foreground/70 focus-visible:ring-ring min-h-[2.5rem] max-h-40 min-w-0 flex-1 resize-none rounded-xl border-0 px-3 py-2.5 text-[15px] leading-relaxed shadow-none focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[2.75rem] sm:px-3.5 sm:py-3 sm:text-sm",
            )}
          />

          <Button
            type="submit"
            size="icon"
            disabled={!canSend}
            aria-label="Send message"
            className={cn(
              "size-8 shrink-0 rounded-xl transition-all sm:size-9",
              canSend
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ArrowUp className="size-4" aria-hidden strokeWidth={2.25} />
            )}
          </Button>
        </div>
      </div>

      {showHint ? (
        <p className="text-muted-foreground/80 mx-auto mt-2 max-w-3xl text-center text-[11px] tracking-wide sm:mt-2.5 sm:text-xs">
          <span className="sm:hidden">Enter to send</span>
          <span className="hidden sm:inline">
            Enter to send · Shift+Enter for a new line
          </span>
        </p>
      ) : null}
    </form>
  );
}
