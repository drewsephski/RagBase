"use client";

import { Button } from "@/components/ui/button";

interface WorkspaceRecoverySectionProps {
  onOpenRecoverySetup?: () => void;
  compact?: boolean;
}

export function WorkspaceRecoverySection({
  onOpenRecoverySetup,
  compact = false,
}: WorkspaceRecoverySectionProps) {
  if (!onOpenRecoverySetup) {
    return null;
  }

  if (compact) {
    return (
      <div className="settings-inline-actions pt-0.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenRecoverySetup}
        >
          Save recovery link
        </Button>
      </div>
    );
  }

  return (
    <section aria-label="Recovery link" className="space-y-3">
      <h3 className="text-sm font-semibold">Recovery link</h3>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Save a private link to open this workspace on another device. Your documents
        and chat history travel with it, and saved workspaces are kept beyond the
        usual inactivity cleanup.
      </p>
      <Button type="button" size="sm" variant="secondary" onClick={onOpenRecoverySetup}>
        Save recovery link
      </Button>
    </section>
  );
}
