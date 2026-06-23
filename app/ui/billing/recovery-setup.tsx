"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { apiJson } from "@/lib/api/client";
import { trackEvent } from "@/lib/analytics/track";
import { setRecoveryConfirmedLocally } from "@/lib/billing/recovery-state";
import { Button } from "@/components/ui/button";

interface RecoverySetupProps {
  workspaceId: string;
  workspaceHeaders: WorkspaceHeaders;
  onComplete: () => void;
  onDefer: () => void;
}

export function RecoverySetup({
  workspaceId,
  workspaceHeaders,
  onComplete,
  onDefer,
}: RecoverySetupProps) {
  const [recoveryUrl, setRecoveryUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRecoveryLink() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiJson<{ url: string; expiresAt: string }>(
          "/api/workspaces/recovery-link",
          {
            method: "POST",
            workspaceHeaders,
          },
        );

        if (!cancelled) {
          setRecoveryUrl(result.url);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not create a recovery link.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRecoveryLink();

    return () => {
      cancelled = true;
    };
  }, [workspaceHeaders]);

  const handleCopy = useCallback(async () => {
    if (!recoveryUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(recoveryUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [recoveryUrl]);

  const handleConfirm = useCallback(async () => {
    setRecoveryConfirmedLocally(workspaceId);

    try {
      await apiJson("/api/workspaces/recovery-acknowledge", {
        method: "POST",
        workspaceHeaders,
      });
    } catch {
      // Local confirmation still counts for UX if server ack fails.
    }

    trackEvent("recovery_link_confirmed");
    onComplete();
  }, [onComplete, workspaceHeaders, workspaceId]);

  const handleDefer = useCallback(() => {
    trackEvent("recovery_link_deferred");
    onDefer();
  }, [onDefer]);

  return (
    <div
      className="bg-background/95 fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
      role="dialog"
      aria-labelledby="recovery-setup-title"
      aria-modal="true"
    >
      <div className="border-border bg-card w-full max-w-md rounded-xl border p-6 shadow-lg">
        <h2 id="recovery-setup-title" className="text-lg font-semibold">
          Your Pro workspace is ready
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Save this private recovery link before crawling your first site.
        </p>

        {isLoading ? (
          <p className="text-muted-foreground mt-4 text-sm">Creating recovery link…</p>
        ) : null}

        {error ? (
          <p className="text-destructive mt-4 text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {recoveryUrl ? (
          <div className="mt-4 space-y-3">
            <div className="bg-muted/40 rounded-md border px-3 py-2 text-left">
              <p className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wide">
                Recovery link
              </p>
              <p className="break-all text-xs">{recoveryUrl}</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" className="sm:flex-1" onClick={() => void handleCopy()}>
                {copied ? "Copied" : "Copy recovery link"}
              </Button>
              <Button type="button" variant="secondary" className="sm:flex-1" onClick={handleConfirm}>
                I saved it
              </Button>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground mt-3 w-full"
          onClick={handleDefer}
        >
          Do this later
        </Button>
      </div>
    </div>
  );
}
