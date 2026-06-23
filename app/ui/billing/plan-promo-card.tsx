"use client";

import { useCallback } from "react";
import { CreditCard, Sparkles } from "lucide-react";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { useBillingPortal } from "@/hooks/use-billing-portal";
import { useCheckout } from "@/hooks/use-checkout";
import { isCheckoutAvailable } from "@/lib/billing/checkout-url";
import { formatBillingPeriodEnd } from "@/lib/billing/display";
import type { SubscriptionStatusResponse } from "@/lib/billing/types";
import { getProPriceDisplay } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { CrawlTeaserHint } from "@/app/ui/home/crawl-teaser-hint";

interface PlanPromoCardProps {
  workspaceHeaders: WorkspaceHeaders | null;
  subscription: SubscriptionStatusResponse | null;
  onPaywallOpen?: () => void;
  surface?: string;
}

export function PlanPromoCard({
  workspaceHeaders,
  subscription,
  onPaywallOpen,
  surface = "sidebar",
}: PlanPromoCardProps) {
  const { openPortal, isOpeningPortal, portalError } = useBillingPortal({
    workspaceHeaders,
    surface: `${surface}_plan_card`,
  });
  const proPrice = getProPriceDisplay();
  const checkoutAvailable = isCheckoutAvailable();
  const workspaceId = workspaceHeaders?.["X-Workspace-Id"] ?? null;
  const isPro = subscription?.isProActive ?? false;
  const { startCheckout } = useCheckout({
    workspaceHeaders,
    surface: `${surface}_plan_card`,
  });

  const handleUpgrade = useCallback(() => {
    if (!workspaceId) {
      return;
    }

    void startCheckout();
  }, [startCheckout, workspaceId]);

  if (isPro) {
    const periodEnd = formatBillingPeriodEnd(subscription?.currentPeriodEnd ?? null);
    const isPastDue = subscription?.stripeSubscriptionStatus === "past_due";
    const quota = subscription?.crawlQuota;

    return (
      <div
        className="border-border/80 bg-card/60 space-y-2 rounded-lg border px-3 py-2.5"
        aria-label="RagBase Pro plan"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="size-3.5 shrink-0 text-amber-400" aria-hidden />
              RagBase Pro
            </p>
            {periodEnd ? (
              <p className="text-muted-foreground text-[11px] leading-relaxed sm:text-xs">
                {isPastDue
                  ? `Payment issue — access until ${periodEnd}`
                  : `Renews ${periodEnd}`}
              </p>
            ) : null}
          </div>
        </div>

        {quota ? (
          <p className="text-muted-foreground text-[11px] leading-relaxed sm:text-xs">
            {quota.crawlsUsed}/{quota.crawlsLimit} site crawls · {quota.pagesUsed}/
            {quota.pagesLimit} pages this period
          </p>
        ) : (
          <p className="text-muted-foreground text-[11px] leading-relaxed sm:text-xs">
            Full-site crawling unlocked
          </p>
        )}

        {subscription?.hasStripeCustomer ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full text-xs"
            disabled={isOpeningPortal}
            onClick={() => void openPortal()}
          >
            <CreditCard className="size-3.5" aria-hidden />
            {isOpeningPortal ? "Opening…" : "Manage billing"}
          </Button>
        ) : null}

        {portalError ? (
          <p className="text-destructive text-[11px]" role="alert">
            {portalError}
          </p>
        ) : null}
      </div>
    );
  }

  if (checkoutAvailable && workspaceId) {
    return (
      <div
        className="border-border/80 bg-card/40 space-y-2 rounded-lg border px-3 py-2.5"
        aria-label="Upgrade to RagBase Pro"
      >
        <p className="text-muted-foreground text-[11px] leading-relaxed sm:text-xs">
          <Sparkles className="mr-1 inline size-3 text-amber-500/80" aria-hidden />
          Crawl docs sites and vendor portals — up to 25 pages per crawl.
        </p>
        <Button
          type="button"
          size="sm"
          className="h-8 w-full text-xs"
          onClick={handleUpgrade}
        >
          Upgrade to Pro · {proPrice}
        </Button>
      </div>
    );
  }

  if (onPaywallOpen) {
    return <CrawlTeaserHint onLearnMore={onPaywallOpen} />;
  }

  return null;
}
