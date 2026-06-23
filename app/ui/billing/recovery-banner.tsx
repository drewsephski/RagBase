"use client";

import { Button } from "@/components/ui/button";

interface RecoveryBannerProps {
  onSaveRecoveryLink: () => void;
}

export function RecoveryBanner({ onSaveRecoveryLink }: RecoveryBannerProps) {
  return (
    <div
      className="border-amber-500/30 bg-amber-500/10 text-amber-100 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
      role="status"
    >
      <p>Save your recovery link so you don&apos;t lose Pro access on this device.</p>
      <Button type="button" size="sm" variant="secondary" onClick={onSaveRecoveryLink}>
        Save recovery link
      </Button>
    </div>
  );
}
