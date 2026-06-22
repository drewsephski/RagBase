"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CrawlTeaserHintProps {
  onLearnMore: () => void;
}

export function CrawlTeaserHint({ onLearnMore }: CrawlTeaserHintProps) {
  return (
    <p className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-[11px] leading-relaxed sm:justify-start sm:text-xs">
      <Sparkles className="size-3 shrink-0 text-amber-500/80" aria-hidden />
      <span>Need an entire website?</span>
      <Button
        type="button"
        variant="link"
        className="text-muted-foreground hover:text-foreground h-auto p-0 text-[11px] sm:text-xs"
        onClick={onLearnMore}
      >
        Full-site crawling is coming soon
      </Button>
    </p>
  );
}
