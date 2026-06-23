"use client";

import { useCallback, useState } from "react";
import { LogIn, LogOut, UserRound } from "lucide-react";
import type { WorkspaceHeaders } from "@/lib/api/types";
import { linkWorkspaceToAccount } from "@/lib/workspace/account-sync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseAuthState } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface AccountSectionProps {
  auth: UseAuthState;
  workspaceHeaders: WorkspaceHeaders | null;
  onAccountSynced?: () => void;
  compact?: boolean;
}

export function AccountSection({
  auth,
  workspaceHeaders,
  onAccountSynced,
  compact = false,
}: AccountSectionProps) {
  const { user, isLoading, isConfigured, signInWithEmail, signOut } = auth;
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const handleSignIn = useCallback(async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await signInWithEmail(email);
      setStatusMessage("Check your email for a sign-in link.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not send sign-in link.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [email, signInWithEmail]);

  const handleSignOut = useCallback(async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await signOut();
      setEmail("");
      setStatusMessage("Signed out.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not sign out.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [signOut]);

  const handleLinkWorkspace = useCallback(async () => {
    if (!workspaceHeaders) {
      return;
    }

    setIsLinking(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await linkWorkspaceToAccount(workspaceHeaders);
      setStatusMessage("Workspace linked to your account.");
      onAccountSynced?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not link workspace to your account.",
      );
    } finally {
      setIsLinking(false);
    }
  }, [onAccountSynced, workspaceHeaders]);

  if (!isConfigured) {
    return null;
  }

  return (
    <section
      aria-label="Account"
      className={cn(
        compact ? "settings-section space-y-2" : "space-y-3",
      )}
    >
      <div className={cn(compact ? "settings-section-header" : "flex items-center gap-2")}>
        <UserRound
          className={cn("shrink-0", compact ? "text-muted-foreground size-3.5" : "size-4")}
          aria-hidden
        />
        <h3 className={compact ? undefined : "text-sm font-semibold"}>Account</h3>
      </div>

      <p className={compact ? "settings-section-desc" : "text-muted-foreground text-xs leading-relaxed"}>
        Optional. Sign in to sync workspaces across devices and keep chat history
        tied to your account — not just this browser.
      </p>

      {isLoading ? (
        <p className="text-muted-foreground text-[11px]" role="status">
          Loading account…
        </p>
      ) : user ? (
        <div className="space-y-2">
          <p className="truncate text-xs sm:text-sm">
            Signed in as <span className="font-medium">{user.email}</span>
          </p>
          <div className="settings-inline-actions">
            {workspaceHeaders ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleLinkWorkspace()}
                disabled={isLinking || isSubmitting}
              >
                {isLinking ? "Linking…" : "Link workspace"}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void handleSignOut()}
              disabled={isSubmitting || isLinking}
            >
              <LogOut aria-hidden />
              Sign out
            </Button>
          </div>
        </div>
      ) : (
        <div className="ingest-composer space-y-1.5 rounded-xl border p-1">
          <div className="settings-form-row gap-1.5">
            <Label htmlFor="account-email" className="sr-only sm:not-sr-only">
              Email
            </Label>
            <Input
              id="account-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              aria-label="Email for sign in"
              className="min-w-0 flex-1 border-0 shadow-none focus-visible:ring-1"
            />
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={() => void handleSignIn()}
              disabled={isSubmitting}
            >
              <LogIn aria-hidden />
              {isSubmitting ? "Sending…" : "Sign in"}
            </Button>
          </div>
        </div>
      )}

      {statusMessage ? (
        <p className="text-muted-foreground text-[11px]" role="status">
          {statusMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="text-destructive text-[11px]" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
