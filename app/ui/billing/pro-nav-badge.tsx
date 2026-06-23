"use client";

import { CreditCard, Sparkles } from "lucide-react";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { useBillingPortal } from "@/hooks/use-billing-portal";
import type { SubscriptionStatusResponse } from "@/lib/billing/types";
import { Button } from "@/components/ui/button";

interface ProNavBadgeProps {
  workspaceHeaders: WorkspaceHeaders | null;
  subscription: SubscriptionStatusResponse | null;
}

export function ProNavBadge({ workspaceHeaders, subscription }: ProNavBadgeProps) {
  const { openPortal, isOpeningPortal } = useBillingPortal({
    workspaceHeaders,
    surface: "navbar",
  });

  if (!subscription?.isProActive || !subscription.hasStripeCustomer) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1.5 px-2.5 text-xs max-sm:px-2"
      disabled={isOpeningPortal}
      onClick={() => void openPortal()}
      aria-label="Manage RagBase Pro billing"
    >
      <Sparkles className="size-3.5 text-amber-400" aria-hidden />
      Pro
      <CreditCard className="text-muted-foreground size-3.5 max-sm:hidden" aria-hidden />
    </Button>
  );
}
