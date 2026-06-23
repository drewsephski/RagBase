"use client";

import { useCallback, useState } from "react";
import { LogIn, LogOut, UserRound } from "lucide-react";
import type { WorkspaceHeaders } from "@/lib/api/types";
import { linkWorkspaceToAccount } from "@/lib/workspace/account-sync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseAuthState } from "@/hooks/use-auth";

interface AccountSectionProps {
  auth: UseAuthState;
  workspaceHeaders: WorkspaceHeaders | null;
  onAccountSynced?: () => void;
}

export function AccountSection({
  auth,
  workspaceHeaders,
  onAccountSynced,
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
    <section aria-label="Account" className="space-y-3">
      <div className="flex items-center gap-2">
        <UserRound className="size-4" aria-hidden />
        <h3 className="text-sm font-semibold">Account</h3>
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">
        Optional. Sign in to sync workspaces across devices and keep chat history
        tied to your account — not just this browser.
      </p>

      {isLoading ? (
        <p className="text-muted-foreground text-xs" role="status">Loading account…</p>
      ) : user ? (
        <div className="space-y-3">
          <p className="text-sm">
            Signed in as <span className="font-medium">{user.email}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {workspaceHeaders ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleLinkWorkspace()}
                disabled={isLinking || isSubmitting}
              >
                {isLinking ? "Linking…" : "Link this workspace"}
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
        <div className="space-y-2">
          <Label htmlFor="account-email">Email</Label>
          <Input
            id="account-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-label="Email for sign in"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSignIn()}
            disabled={isSubmitting}
          >
            <LogIn aria-hidden />
            {isSubmitting ? "Sending…" : "Email me a sign-in link"}
          </Button>
        </div>
      )}

      {statusMessage ? (
        <p className="text-muted-foreground text-xs" role="status">{statusMessage}</p>
      ) : null}
      {errorMessage ? (
        <p className="text-destructive text-xs" role="alert">{errorMessage}</p>
      ) : null}
    </section>
  );
}
