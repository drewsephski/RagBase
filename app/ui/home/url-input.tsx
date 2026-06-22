"use client";

import { useCallback, useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UrlInputProps {
  onSubmit: (
    url: string,
  ) => Promise<{ teaser?: boolean; message?: string; source?: { name: string } } | void>;
  disabled?: boolean;
  variant?: "default" | "minimal";
}

export function UrlInput({
  onSubmit,
  disabled = false,
  variant = "default",
}: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmed = url.trim();
      if (!trimmed) {
        setError("Paste a link to a public page.");
        return;
      }

      setError(null);
      setSuccessMessage(null);
      setIsSubmitting(true);

      try {
        const result = await onSubmit(trimmed);
        setUrl("");

        if (result?.teaser) {
          return;
        }

        if (result?.source?.name && variant === "default") {
          setSuccessMessage(`Added "${result.source.name}". Indexing now…`);
        }
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Could not add that link. Try another URL.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, url],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {variant === "default" ? (
        <Label htmlFor="url-input" className="text-sm font-medium">
          Or paste a public link
        </Label>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="relative min-w-0 flex-1">
          <Link2
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="url-input"
            type="url"
            inputMode="url"
            placeholder={
              variant === "minimal"
                ? "Paste a public link"
                : "https://example.com/article"
            }
            value={url}
            disabled={disabled || isSubmitting}
            onChange={(event) => setUrl(event.target.value)}
            className="pl-9"
            aria-label="Public page URL"
          />
        </div>

        <Button
          type="submit"
          disabled={disabled || isSubmitting || !url.trim()}
          className="w-full shrink-0 sm:w-auto"
          aria-label="Add link"
          variant={variant === "minimal" ? "secondary" : "default"}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Adding…
            </>
          ) : variant === "minimal" ? (
            "Add"
          ) : (
            "Add link"
          )}
        </Button>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {successMessage ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {successMessage}
        </p>
      ) : null}
    </form>
  );
}
