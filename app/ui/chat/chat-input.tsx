"use client";

import { useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
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

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t bg-background px-3 py-3 pb-safe sm:px-6 sm:py-5"
    >
      <div className="mx-auto flex w-full max-w-3xl items-end gap-2 sm:gap-3">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-input"
          rows={2}
          value={value}
          disabled={disabled || isLoading}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Ask a question"
          className={cn(
            "border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[2.75rem] max-h-40 min-w-0 flex-1 resize-none rounded-md border px-3 py-2.5 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[3.25rem] sm:py-3",
          )}
        />

        <Button
          type="submit"
          size="icon"
          disabled={disabled || sendDisabled || isLoading || !value.trim()}
          aria-label="Send message"
          className="mb-0.5 size-9 shrink-0 sm:size-10"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
        </Button>
      </div>

      {showHint ? (
        <p className="text-muted-foreground mx-auto mt-2 max-w-3xl text-center text-[11px] sm:mt-3 sm:text-xs">
          <span className="sm:hidden">Enter to send</span>
          <span className="hidden sm:inline">
            Enter to send · Shift+Enter for a new line
          </span>
        </p>
      ) : null}
    </form>
  );
}
