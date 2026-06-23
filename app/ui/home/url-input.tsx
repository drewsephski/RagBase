"use client";

import { useCallback, useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UrlIngestLoader } from "@/app/ui/home/url-ingest-loader";
import { cn } from "@/lib/utils";

interface UrlInputProps {
  onSubmit: (
    url: string,
  ) => Promise<
    | {
        teaser?: boolean;
        message?: string;
        notice?: string;
        source?: { name: string };
      }
    | void
  >;
  disabled?: boolean;
  variant?: "default" | "minimal";
  compact?: boolean;
}

export function UrlInput({
  onSubmit,
  disabled = false,
  variant = "default",
  compact = false,
}: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [submittingUrl, setSubmittingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const isSubmitting = submittingUrl !== null;
  const loaderVariant = variant === "minimal" ? "default" : "compact";

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
      setNoticeMessage(null);
      setSubmittingUrl(trimmed);

      try {
        const result = await onSubmit(trimmed);
        setUrl("");

        if (result?.teaser) {
          return;
        }

        if (result?.notice) {
          setNoticeMessage(result.notice);
        }

        if (result?.source?.name) {
          setSuccessMessage(`Added "${result.source.name}". Reading now…`);
        }
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Could not add that link. Try another URL.",
        );
      } finally {
        setSubmittingUrl(null);
      }
    },
    [onSubmit, url],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {variant === "default" ? (
        <Label
          htmlFor="url-input"
          className={cn("font-medium", compact ? "text-xs" : "text-sm")}
        >
          Or paste a public link
        </Label>
      ) : null}

      <div
        className={cn(
          "flex flex-col gap-1.5 sm:flex-row sm:items-start",
          isSubmitting && "sm:items-stretch",
        )}
      >
        <div className="relative min-w-0 flex-1">
          <Link2
            className={cn(
              "text-muted-foreground pointer-events-none absolute top-1/2 -translate-y-1/2 transition-opacity",
              compact ? "left-2.5 size-3.5" : "left-3 size-4",
              isSubmitting && "opacity-40",
            )}
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
            className={cn(
              "transition-opacity",
              compact ? "h-8 pl-8 text-xs md:text-xs placeholder:text-xs" : "pl-9",
              isSubmitting && "opacity-60",
            )}
            aria-label="Public page URL"
            aria-busy={isSubmitting}
          />
        </div>

        <Button
          type="submit"
          disabled={disabled || isSubmitting || !url.trim()}
          className="w-full shrink-0 sm:w-auto"
          size={compact ? "sm" : "default"}
          aria-label="Add link"
          variant={variant === "minimal" ? "secondary" : "default"}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Reading…
            </>
          ) : variant === "minimal" ? (
            "Add"
          ) : (
            "Add link"
          )}
        </Button>
      </div>

      {isSubmitting && submittingUrl ? (
        <UrlIngestLoader url={submittingUrl} variant={loaderVariant} />
      ) : null}

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

      {noticeMessage ? (
        <p className="text-muted-foreground text-xs leading-relaxed" role="status">
          {noticeMessage}
        </p>
      ) : null}
    </form>
  );
}
