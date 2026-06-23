"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReclaimNoticeBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ReclaimNoticeBanner({ message, onDismiss }: ReclaimNoticeBannerProps) {
  return (
    <div
      className="border-destructive/30 bg-destructive/10 text-destructive-foreground flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
      role="alert"
    >
      <p className="min-w-0 flex-1">{message}</p>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8 shrink-0"
        onClick={onDismiss}
        aria-label="Dismiss Pro subscription notice"
      >
        <X className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
