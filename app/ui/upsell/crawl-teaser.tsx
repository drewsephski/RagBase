"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CrawlTeaserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url?: string;
  message?: string;
}

export function CrawlTeaser({
  open,
  onOpenChange,
  url,
  message = "Want to crawl this whole site? Full-site ingestion is coming soon.",
}: CrawlTeaserProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="crawl-teaser-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-400" aria-hidden />
            Full-site reading is coming soon
          </DialogTitle>
          <DialogDescription id="crawl-teaser-description">
            {message}
          </DialogDescription>
        </DialogHeader>

        {url ? (
          <p className="text-muted-foreground truncate text-sm" title={url}>
            {url}
          </p>
        ) : null}

        <p className="text-muted-foreground text-sm">
          For now, paste a link to a single public page — like an article,
          policy, or help doc — and we&apos;ll read just that page.
        </p>

        <Button type="button" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  );
}
