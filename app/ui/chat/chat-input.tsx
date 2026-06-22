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
      className="border-t bg-background px-4 py-5 sm:px-6 sm:py-7"
    >
      <div className="mx-auto flex w-full max-w-4xl items-end justify-center gap-2 sm:gap-3">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-input"
          rows={3}
          value={value}
          disabled={disabled || isLoading}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Ask a question"
          className={cn(
            "border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full max-w-xs min-h-[4.5rem] max-h-40 resize-none rounded-md border px-3 py-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-sm md:max-w-md lg:max-w-lg",
          )}
        />

        <Button
          type="submit"
          size="icon"
          disabled={disabled || sendDisabled || isLoading || !value.trim()}
          aria-label="Send message"
          className="mb-0.5 size-10 shrink-0 sm:size-11"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
        </Button>
      </div>

      {showHint ? (
        <p className="text-muted-foreground mx-auto mt-3 hidden max-w-4xl text-center text-xs sm:block">
          Enter to send · Shift+Enter for a new line
        </p>
      ) : null}
    </form>
  );
}
