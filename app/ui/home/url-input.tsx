"use client";

import { useCallback, useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatePresence } from "framer-motion";
import { UrlIngestLoader } from "@/app/ui/home/url-ingest-loader";
import type { UrlIngestResult } from "@/hooks/use-ingestion";
import { normalizeUrl, UrlScrapeError, isRootUrl } from "@/lib/ingestion/url-utils";
import { cn } from "@/lib/utils";

interface UrlInputProps {
  onSubmit: (url: string) => Promise<UrlIngestResult | void>;
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

      let normalizedUrl: string;
      try {
        normalizedUrl = normalizeUrl(trimmed);
      } catch (validationError) {
        setError(
          validationError instanceof UrlScrapeError
            ? validationError.message
            : "Enter a valid public link.",
        );
        return;
      }

      setError(null);
      setSuccessMessage(null);
      setNoticeMessage(null);

      const opensChoiceDialog = isRootUrl(normalizedUrl);
      if (!opensChoiceDialog) {
        setSubmittingUrl(normalizedUrl);
      }

      try {
        const result = await onSubmit(normalizedUrl);

        if (result?.pendingChoice) {
          return;
        }

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
        if (!opensChoiceDialog) {
          setSubmittingUrl(null);
        }
      }
    },
    [onSubmit, url],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
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
          "ingest-composer rounded-2xl border p-1.5 sm:p-2",
          isSubmitting && "opacity-95",
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2",
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
              type="text"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              placeholder={
                variant === "minimal"
                  ? "example.com/article or https://…"
                  : "example.com/article"
              }
              value={url}
              disabled={disabled || isSubmitting}
              onChange={(event) => {
                setUrl(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              className={cn(
                "border-0 shadow-none transition-opacity focus-visible:ring-1",
                compact
                  ? "h-8 pl-8 text-xs md:text-xs placeholder:text-xs"
                  : "min-h-[2.5rem] pl-9 sm:min-h-[2.75rem]",
                isSubmitting && "opacity-60",
              )}
              aria-label="Public page URL"
              aria-busy={isSubmitting}
              aria-invalid={error ? true : undefined}
            />
          </div>

          <Button
            type="submit"
            disabled={disabled || isSubmitting || !url.trim()}
            className={cn(
              "w-full shrink-0 sm:w-auto",
              variant === "minimal" ? "rounded-xl" : "rounded-xl shadow-sm",
            )}
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
      </div>

      <AnimatePresence>
        {isSubmitting && submittingUrl ? (
          <UrlIngestLoader url={submittingUrl} variant={loaderVariant} />
        ) : null}
      </AnimatePresence>

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
