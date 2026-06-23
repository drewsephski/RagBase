"use client";

import { useCallback, useState } from "react";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { useSubscription } from "@/hooks/use-subscription";
import { apiJson } from "@/lib/api/client";
import { getProPriceDisplay } from "@/lib/site";
import { supportMailto } from "@/lib/support";
import { Button } from "@/components/ui/button";

interface BillingSectionProps {
  workspaceHeaders: WorkspaceHeaders | null;
  open: boolean;
  onOpenRecoverySetup?: () => void;
}

function formatPeriodEnd(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BillingSection({
  workspaceHeaders,
  open,
  onOpenRecoverySetup,
}: BillingSectionProps) {
  const { subscription, isLoading, refresh } = useSubscription({
    headers: workspaceHeaders,
    enabled: open && Boolean(workspaceHeaders),
  });
  const [portalError, setPortalError] = useState<string | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const proPrice = getProPriceDisplay();

  const handleManageBilling = useCallback(async () => {
    if (!workspaceHeaders) {
      return;
    }

    setPortalError(null);
    setIsOpeningPortal(true);

    try {
      const result = await apiJson<{ url: string }>("/api/billing/portal", {
        method: "POST",
        workspaceHeaders,
      });

      window.location.href = result.url;
    } catch (error) {
      setPortalError(
        error instanceof Error
          ? error.message
          : "Could not open billing portal.",
      );
    } finally {
      setIsOpeningPortal(false);
    }
  }, [workspaceHeaders]);

  if (!workspaceHeaders) {
    return null;
  }

  if (isLoading && !subscription) {
    return (
      <section aria-label="Billing" className="space-y-2">
        <h3 className="text-sm font-semibold">Billing</h3>
        <p className="text-muted-foreground text-xs">Loading plan details…</p>
      </section>
    );
  }

  const isPro = subscription?.isProActive ?? false;
  const periodEnd = formatPeriodEnd(subscription?.currentPeriodEnd ?? null);

  return (
    <section aria-label="Billing" className="space-y-3">
      <h3 className="text-sm font-semibold">Billing</h3>

      <div className="rounded-md border px-3 py-2">
        <p className="text-sm font-medium">
          {isPro ? "RagBase Pro" : "Free workspace"}
        </p>
        {isPro && periodEnd ? (
          <p className="text-muted-foreground mt-1 text-xs">
            {subscription?.stripeSubscriptionStatus === "past_due"
              ? `Payment issue — access until ${periodEnd}`
              : `Renews ${periodEnd}`}
          </p>
        ) : (
          <p className="text-muted-foreground mt-1 text-xs">
            Upgrade to RagBase Pro · {proPrice} for full-site crawling.
          </p>
        )}
      </div>

      {isPro && subscription?.crawlQuota ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Site crawls this period: {subscription.crawlQuota.crawlsUsed}/
          {subscription.crawlQuota.crawlsLimit} · Pages indexed:{" "}
          {subscription.crawlQuota.pagesUsed}/{subscription.crawlQuota.pagesLimit}
        </p>
      ) : null}

      {subscription?.hasStripeCustomer ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isOpeningPortal}
          onClick={() => void handleManageBilling()}
        >
          {isOpeningPortal ? "Opening…" : "Manage billing"}
        </Button>
      ) : null}

      {portalError ? (
        <p className="text-destructive text-xs" role="alert">
          {portalError}{" "}
          <a className="underline" href={supportMailto("Billing portal issue")}>
            Contact support
          </a>
        </p>
      ) : null}

      {isPro && !subscription?.recoveryLinkConfirmed ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Save a recovery link to open this Pro workspace on another device.
          </p>
          <Button type="button" size="sm" variant="secondary" onClick={onOpenRecoverySetup}>
            Save recovery link
          </Button>
        </div>
      ) : null}

      {!isPro && subscription?.hasStripeCustomer && !subscription.isProActive ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Subscription issue detected.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void refresh()}
          >
            Refresh status
          </button>{" "}
          or{" "}
          <a className="underline" href={supportMailto("Pro subscription issue")}>
            contact support
          </a>
          .
        </p>
      ) : null}
    </section>
  );
}
