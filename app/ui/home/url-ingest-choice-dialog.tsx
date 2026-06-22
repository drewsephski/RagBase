"use client";

import { Globe, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UrlIngestChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  onSinglePage: (url: string) => void;
  onCrawlSite: (url: string) => void;
}

export function UrlIngestChoiceDialog({
  open,
  onOpenChange,
  url,
  onSinglePage,
  onCrawlSite,
}: UrlIngestChoiceDialogProps) {
  const handleSinglePage = () => {
    onOpenChange(false);
    onSinglePage(url);
  };

  const handleCrawlSite = () => {
    onOpenChange(false);
    onCrawlSite(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        <div className="flex flex-col gap-2">
          <Button type="button" variant="secondary" onClick={handleSinglePage}>
            Add this page only
          </Button>
          <Button type="button" onClick={handleCrawlSite}>
            <Globe className="size-4" aria-hidden />
            Crawl entire site
          </Button>
        </div>

        <p className="text-muted-foreground text-xs leading-relaxed">
          Single-page links are always free. Full-site crawling requires Pro.
        </p>
      </DialogContent>
    </Dialog>
  );
}
