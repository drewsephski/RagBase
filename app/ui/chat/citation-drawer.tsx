"use client";

import { Loader2 } from "lucide-react";
import { isFallbackCitation, type DisplayCitation } from "@/lib/chat/citations";
import { MarkdownContent } from "@/components/markdown-content";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CitationDrawerProps {
  citation: DisplayCitation | null;
  open: boolean;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CitationDrawer({
  citation,
  open,
  isLoading = false,
  onOpenChange,
}: CitationDrawerProps) {
  if (!citation) {
    return null;
  }

  const showUnavailable =
    !isLoading && isFallbackCitation(citation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(85vh,32rem)] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Source [{citation.ref}]</DialogTitle>
          <DialogDescription>
            {isLoading ? (
              "Loading source details…"
            ) : showUnavailable ? (
              "We couldn't load the full source details for this citation yet."
            ) : citation.sourceName ? (
              <>
                {citation.sourceName}
                {citation.sourceLocation ? (
                  <>
                    {" · "}
                    <a
                      href={citation.sourceLocation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {citation.sourceLocation}
                    </a>
                  </>
                ) : null}
              </>
            ) : (
              "Exact passage referenced in the answer"
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[40vh] rounded-md border p-3 sm:max-h-[50vh] sm:p-4">
          {isLoading ? (
            <div
              className="text-muted-foreground flex items-center gap-2 text-sm"
              aria-live="polite"
            >
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              Loading the cited passage…
            </div>
          ) : (
            <div className="border-primary border-l-2 pl-3">
              <MarkdownContent content={citation.snippet} size="sm" />
            </div>
          )}
        </ScrollArea>

        <p className="text-muted-foreground text-xs">
          This quote comes directly from your uploaded document. Always verify
          important details in the original file.
        </p>
      </DialogContent>
    </Dialog>
  );
}
