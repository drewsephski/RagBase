"use client";

import { useCallback } from "react";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { useSubscription } from "@/hooks/use-subscription";
import { useBillingPortal } from "@/hooks/use-billing-portal";
import { useCheckout } from "@/hooks/use-checkout";
import { isCheckoutAvailable } from "@/lib/billing/checkout-url";
import { formatBillingPeriodEnd } from "@/lib/billing/display";
import { getProPriceDisplay } from "@/lib/site";
import { supportMailto } from "@/lib/support";
import { Button } from "@/components/ui/button";

interface BillingSectionProps {
  workspaceHeaders: WorkspaceHeaders | null;
  open: boolean;
}

export function BillingSection({
  workspaceHeaders,
  open,
}: BillingSectionProps) {
  const { subscription, isLoading, refresh } = useSubscription({
    headers: workspaceHeaders,
    enabled: open && Boolean(workspaceHeaders),
  });
  const { openPortal, isOpeningPortal, portalError } = useBillingPortal({
    workspaceHeaders,
    surface: "settings_billing",
  });
  const proPrice = getProPriceDisplay();
  const checkoutAvailable = isCheckoutAvailable();
  const workspaceId = workspaceHeaders?.["X-Workspace-Id"] ?? null;
  const { startCheckout, isStartingCheckout } = useCheckout({
    workspaceHeaders,
    surface: "settings_billing",
  });

  const handleUpgrade = useCallback(() => {
    if (!workspaceId) {
      return;
    }

    void startCheckout();
  }, [startCheckout, workspaceId]);

  if (!workspaceHeaders) {
    return null;
  }

  if (isLoading && !subscription) {
    return (
      <section aria-label="Billing" className="settings-section space-y-2">
        <div className="settings-section-header">
          <h3>Billing</h3>
        </div>
        <p className="settings-section-desc">Loading plan details…</p>
      </section>
    );
  }

  const isPro = subscription?.isProActive ?? false;
  const periodEnd = formatBillingPeriodEnd(subscription?.currentPeriodEnd ?? null);
  const billingStatusLabel = (() => {
    if (!isPro) {
      return "Free workspace";
    }

    if (subscription?.stripeSubscriptionStatus === "past_due") {
      return periodEnd ? `Payment issue — access until ${periodEnd}` : "Payment issue";
    }

    if (subscription?.stripeSubscriptionStatus === "trialing") {
      return periodEnd ? `Pro trial — renews ${periodEnd}` : "Pro trial";
    }

    return periodEnd ? `Renews ${periodEnd}` : "Active Pro subscription";
  })();

  return (
    <section aria-label="Billing" className="settings-section space-y-2">
      <div className="settings-section-header">
        <h3>Billing</h3>
      </div>
      <p className="settings-section-desc">
        Current plan and subscription status for this workspace.
      </p>

      <div className="rounded-xl border px-3 py-2">
        <p className="text-sm font-medium">{isPro ? "RagBase Pro" : "Free workspace"}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {isPro
            ? billingStatusLabel
            : `Upgrade to RagBase Pro · ${proPrice} for full-site crawling.`}
        </p>
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
          onClick={() => void openPortal()}
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

      {!isPro && checkoutAvailable ? (
        <Button
          type="button"
          size="sm"
          disabled={isStartingCheckout}
          onClick={handleUpgrade}
        >
          {isStartingCheckout ? "Redirecting…" : `Upgrade to Pro · ${proPrice}`}
        </Button>
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
