"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, Sparkles } from "lucide-react";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { useCheckout } from "@/hooks/use-checkout";
import { isCheckoutAvailable } from "@/lib/billing/checkout-url";
import { apiJson } from "@/lib/api/client";
import { trackEvent } from "@/lib/analytics/track";
import { getProPriceDisplay } from "@/lib/site";
import { WAITLIST_HONEYPOT_FIELD } from "@/lib/waitlist";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseAuthState } from "@/hooks/use-auth";
import { isSupabaseAuthConfigured } from "@/lib/supabase/env";
import { getCheckoutAuthState } from "@/lib/billing/checkout-auth-state";

interface FullSitePaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingUrl?: string;
  workspaceHeaders?: WorkspaceHeaders | null;
  workspaceId?: string | null;
  isProActive?: boolean;
  onStartCrawl?: (url: string) => void;
  onAddPageOnly?: () => void;
  surface?: string;
  auth?: UseAuthState;
}

export function FullSitePaywallDialog({
  open,
  onOpenChange,
  pendingUrl,
  workspaceHeaders,
  workspaceId,
  isProActive = false,
  onStartCrawl,
  onAddPageOnly,
  surface = "paywall_dialog",
  auth,
}: FullSitePaywallDialogProps) {
  const [email, setEmail] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInStatusMessage, setSignInStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formOpenedAtRef = useRef<number | null>(null);
  const proPrice = getProPriceDisplay();
  const checkoutAvailable = isCheckoutAvailable();
  const checkoutAuth = getCheckoutAuthState({
    isAuthConfigured: isSupabaseAuthConfigured(),
    isLoading: auth?.isLoading,
    hasUser: Boolean(auth?.user),
  });
  const { startCheckout, isStartingCheckout, checkoutError: checkoutStartError } =
    useCheckout({
      workspaceHeaders: workspaceHeaders ?? null,
      workspaceId,
      surface,
      isAuthenticated: checkoutAuth.canCheckout,
      isAuthLoading: checkoutAuth.status === "checking",
    });

  useEffect(() => {
    if (!open) {
      return;
    }

    formOpenedAtRef.current = Date.now();
    setEmail("");
    setSignInEmail("");
    setHoneypot("");
    setError(null);
    setSignInStatusMessage(null);
    setSuccess(false);

    trackEvent("paywall_viewed", {
      surface,
      has_pending_url: Boolean(pendingUrl),
      checkout_available: checkoutAvailable,
    });
  }, [checkoutAvailable, open, pendingUrl, surface]);

  const handleSubscribe = useCallback(() => {
    if (!workspaceId) {
      setError("Create a workspace before subscribing.");
      return;
    }

    if (checkoutAuth.status === "checking" || isStartingCheckout) {
      return;
    }

    void startCheckout();
  }, [checkoutAuth.status, isStartingCheckout, startCheckout, workspaceId]);

  const handleSignInSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!auth?.signInWithEmail) {
        setError("Account sign-in is not configured.");
        return;
      }

      const trimmedEmail = signInEmail.trim();
      if (!trimmedEmail) {
        setError("Enter your email to receive a sign-in link.");
        return;
      }

      trackEvent("paywall_primary_clicked", {
        surface,
        has_pending_url: Boolean(pendingUrl),
        checkout_available: checkoutAvailable,
      });

      setError(null);
      setSignInStatusMessage(null);
      setIsSigningIn(true);

      try {
        await auth.signInWithEmail(trimmedEmail);
        setSignInStatusMessage("Check your email for a sign-in link, then return here to subscribe.");
      } catch (signInError) {
        setError(
          signInError instanceof Error
            ? signInError.message
            : "Could not send sign-in link. Please try again.",
        );
      } finally {
        setIsSigningIn(false);
      }
    },
    [auth, checkoutAvailable, pendingUrl, signInEmail, surface],
  );

  useEffect(() => {
    if (!open || checkoutAuth.status !== "ready" || !auth?.user) {
      return;
    }

    setSignInStatusMessage(null);
  }, [auth?.user, checkoutAuth.status, open]);

  useEffect(() => {
    if (checkoutStartError) {
      setError(checkoutStartError);
    }
  }, [checkoutStartError]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        setError("Enter your email to join the waitlist.");
        return;
      }

      trackEvent("paywall_primary_clicked", {
        surface,
        has_pending_url: Boolean(pendingUrl),
        checkout_available: checkoutAvailable,
      });

      setError(null);
      setIsSubmitting(true);

      try {
        await apiJson<{ success: boolean }>("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmedEmail,
            feature: "full_site_crawl",
            source: surface,
            [WAITLIST_HONEYPOT_FIELD]: honeypot,
            formOpenedAt: formOpenedAtRef.current ?? undefined,
          }),
          workspaceHeaders,
        });

        trackEvent("paywall_waitlist_submitted", {
          surface,
          feature: "full_site_crawl",
        });

        setSuccess(true);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Could not join the waitlist. Please try again.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [checkoutAvailable, email, honeypot, pendingUrl, surface, workspaceHeaders],
  );

  const handleAddPageOnly = useCallback(() => {
    onAddPageOnly?.();
    onOpenChange(false);
  }, [onAddPageOnly, onOpenChange]);

  const handleStartCrawl = useCallback(() => {
    if (!pendingUrl) {
      setError("Paste a site URL first, then choose site crawling.");
      return;
    }

    trackEvent("crawl_started", {
      surface,
      has_pending_url: true,
    });

    onStartCrawl?.(pendingUrl);
    onOpenChange(false);
  }, [onOpenChange, onStartCrawl, pendingUrl, surface]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        aria-describedby="full-site-paywall-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-5 text-sky-400" aria-hidden />
            Read an entire website
          </DialogTitle>
          <DialogDescription id="full-site-paywall-description">
            Crawl docs sites, policy hubs, and vendor portals — with cited answers
            across every page you add.
          </DialogDescription>
        </DialogHeader>

        {pendingUrl ? (
          <p className="text-muted-foreground truncate text-sm" title={pendingUrl}>
            {pendingUrl}
          </p>
        ) : null}

        <ul className="text-muted-foreground space-y-1.5 text-sm">
          <li className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber-400" aria-hidden />
            One bundled source with an expandable page list
          </li>
          <li className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber-400" aria-hidden />
            Up to 25 pages per crawl with RagBase Pro
          </li>
        </ul>

        <p className="text-muted-foreground text-xs leading-relaxed">
          Single pages stay free — paste any article or doc link anytime.
        </p>

        <p className="text-muted-foreground rounded-md border px-3 py-2 text-xs leading-relaxed">
          Pro is linked to your account when you sign in before checkout — so
          deleting a workspace does not strand your subscription.
        </p>

        {isProActive ? (
          <div className="space-y-3">
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                disabled={!pendingUrl}
                className="sm:flex-1"
                onClick={handleStartCrawl}
              >
                Start site crawl
              </Button>
              {pendingUrl && onAddPageOnly ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={handleAddPageOnly}
                >
                  Add this page only
                </Button>
              ) : null}
            </div>

            <p className="text-muted-foreground text-[11px] leading-relaxed">
              RagBase Pro · up to 25 pages per crawl
            </p>
          </div>
        ) : checkoutAvailable ? (
          <div className="space-y-3">
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}

            {checkoutAuth.status === "sign_in_required" ? (
              <form onSubmit={handleSignInSubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="paywall-sign-in-email" className="text-sm">
                    Sign in to subscribe
                  </Label>
                  <Input
                    id="paywall-sign-in-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={signInEmail}
                    disabled={isSigningIn}
                    onChange={(event) => setSignInEmail(event.target.value)}
                    aria-label="Email for account sign in"
                  />
                </div>

                {signInStatusMessage ? (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
                    {signInStatusMessage}
                  </p>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="submit"
                    disabled={isSigningIn || !workspaceId}
                    className="sm:flex-1"
                    aria-busy={isSigningIn}
                  >
                    {isSigningIn ? "Sending link…" : "Send sign-in link"}
                  </Button>
                  {pendingUrl && onAddPageOnly ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-muted-foreground"
                      disabled={isSigningIn}
                      onClick={handleAddPageOnly}
                    >
                      Add this page only
                    </Button>
                  ) : null}
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  disabled={
                    isSubmitting ||
                    isStartingCheckout ||
                    !workspaceId ||
                    checkoutAuth.status === "checking"
                  }
                  className="sm:flex-1"
                  onClick={handleSubscribe}
                  aria-busy={checkoutAuth.status === "checking" || isStartingCheckout}
                >
                  {checkoutAuth.status === "checking"
                    ? "Checking account…"
                    : isStartingCheckout
                      ? "Redirecting…"
                      : "Unlock site crawling"}
                </Button>
                {pendingUrl && onAddPageOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground"
                    disabled={isSubmitting || isStartingCheckout}
                    onClick={handleAddPageOnly}
                  >
                    Add this page only
                  </Button>
                ) : null}
              </div>
            )}

            <p className="text-muted-foreground text-[11px] leading-relaxed">
              RagBase Pro · {proPrice}
              {checkoutAuth.statusMessage ? ` · ${checkoutAuth.statusMessage}` : ""}
            </p>
          </div>
        ) : success ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
            You&apos;re on the list — we&apos;ll email you when site crawling
            launches.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="waitlist-email" className="text-sm">
                RagBase Pro · {proPrice}
              </Label>
              <Input
                id="waitlist-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                disabled={isSubmitting}
                onChange={(event) => setEmail(event.target.value)}
                aria-label="Email for waitlist"
              />
            </div>

            <div className="hidden" aria-hidden>
              <Label htmlFor="waitlist-website">Website</Label>
              <Input
                id="waitlist-website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />
            </div>

            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button type="submit" disabled={isSubmitting} className="sm:flex-1">
                {isSubmitting ? "Joining…" : "Unlock site crawling"}
              </Button>
              {pendingUrl && onAddPageOnly ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground"
                  disabled={isSubmitting}
                  onClick={handleAddPageOnly}
                >
                  Add this page only
                </Button>
              ) : null}
            </div>

            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Checkout opening soon — join the waitlist to get early access.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
