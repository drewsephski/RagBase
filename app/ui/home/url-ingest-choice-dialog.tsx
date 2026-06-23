"use client";

import { useCallback, useState } from "react";
import { Globe, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UrlIngestLoader } from "@/app/ui/home/url-ingest-loader";
import type { UrlIngestResult } from "@/hooks/use-ingestion";

interface UrlIngestChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  onSinglePage: (url: string) => Promise<UrlIngestResult | void>;
  onCrawlSite: (url: string) => void;
}

export function UrlIngestChoiceDialog({
  open,
  onOpenChange,
  url,
  onSinglePage,
  onCrawlSite,
}: UrlIngestChoiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isSubmitting) {
        return;
      }

      if (!nextOpen) {
        setError(null);
      }

      onOpenChange(nextOpen);
    },
    [isSubmitting, onOpenChange],
  );

  const handleSinglePage = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await onSinglePage(url);
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not add that page. Try another URL.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [onOpenChange, onSinglePage, url]);

  const handleCrawlSite = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    onOpenChange(false);
    onCrawlSite(url);
  }, [isSubmitting, onCrawlSite, onOpenChange, url]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby="url-ingest-choice-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-5" aria-hidden />
            How should we read this site?
          </DialogTitle>
          <DialogDescription id="url-ingest-choice-description">
            This looks like a homepage. Choose one page for free, or unlock a full-site
            crawl with RagBase Pro.
          </DialogDescription>
        </DialogHeader>

        <p className="text-muted-foreground truncate text-sm" title={url}>
          {url}
        </p>

        {isSubmitting ? (
          <UrlIngestLoader url={url} variant="compact" />
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleSinglePage()}
            >
              Add this page only
            </Button>
            <Button type="button" onClick={handleCrawlSite}>
              <Globe className="size-4" aria-hidden />
              Crawl entire site
            </Button>
          </div>
        )}

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {isSubmitting ? (
          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Firecrawl is fetching and extracting readable text…
          </p>
        ) : (
          <p className="text-muted-foreground text-xs leading-relaxed">
            Single-page links are always free. Full-site crawling requires Pro.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
