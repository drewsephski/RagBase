"use client";

import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkspaceRecoverySectionProps {
  onOpenRecoverySetup?: () => void;
}

export function WorkspaceRecoverySection({
  onOpenRecoverySetup,
}: WorkspaceRecoverySectionProps) {
  if (!onOpenRecoverySetup) {
    return null;
  }

  return (
    <section aria-label="Recovery link" className="space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="size-4" aria-hidden />
        <h3 className="text-sm font-semibold">Recovery link</h3>
      </div>
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
