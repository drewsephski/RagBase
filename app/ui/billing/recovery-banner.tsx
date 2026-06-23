"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecoveryBannerProps {
  onSaveRecoveryLink: () => void;
  onDismiss?: () => void;
  dismissible?: boolean;
}

export function RecoveryBanner({
  onSaveRecoveryLink,
  onDismiss,
  dismissible = false,
}: RecoveryBannerProps) {
  return (
    <div
      className="border-amber-500/30 bg-amber-500/10 text-amber-100 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
      role="status"
    >
      <p className="min-w-0 flex-1">
        Save a recovery link so you don&apos;t lose this workspace on another device.
        Your documents and chat history travel with it.
      </p>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onSaveRecoveryLink}>
          Save recovery link
        </Button>
        {dismissible && onDismiss ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-amber-100/80 hover:text-amber-50 size-8"
            onClick={onDismiss}
            aria-label="Dismiss recovery reminder"
          >
            <X className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
