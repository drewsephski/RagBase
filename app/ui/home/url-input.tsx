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
}

export function UrlInput({
  onSubmit,
  disabled = false,
  variant = "default",
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
        <Label htmlFor="url-input" className="text-sm font-medium">
          Or paste a public link
        </Label>
      ) : null}

      <div
        className={cn(
          "flex flex-col gap-2 sm:flex-row sm:items-start",
          isSubmitting && "sm:items-stretch",
        )}
      >
        <div className="relative min-w-0 flex-1">
          <Link2
            className={cn(
              "text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 transition-opacity",
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
            className={cn("pl-9 transition-opacity", isSubmitting && "opacity-60")}
            aria-label="Public page URL"
            aria-busy={isSubmitting}
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
