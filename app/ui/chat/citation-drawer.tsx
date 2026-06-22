"use client";

import type { ParsedMessageCitation } from "@/lib/chat/parse-message";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CitationDrawerProps {
  citation: ParsedMessageCitation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CitationDrawer({
  citation,
  open,
  onOpenChange,
}: CitationDrawerProps) {
  if (!citation) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(85vh,32rem)] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Source [{citation.ref}]</DialogTitle>
          <DialogDescription>
            Exact passage referenced in the answer
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[40vh] rounded-md border p-3 sm:max-h-[50vh] sm:p-4">
          <blockquote className="border-primary border-l-2 pl-3 text-sm leading-relaxed">
            {citation.snippet}
          </blockquote>
        </ScrollArea>

        <p className="text-muted-foreground text-xs">
          This quote comes directly from your uploaded document. Always verify
          important details in the original file.
        </p>
      </DialogContent>
    </Dialog>
  );
}
