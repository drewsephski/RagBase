"use client";

import { useCallback, useState } from "react";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { apiJson } from "@/lib/api/client";
import { trackEvent } from "@/lib/analytics/track";
import { persistCheckoutWorkspaceId } from "@/lib/billing/checkout-return-state";

interface UseCheckoutOptions {
  workspaceHeaders: WorkspaceHeaders | null;
  workspaceId?: string | null;
  surface?: string;
}

interface UseCheckoutState {
  startCheckout: () => Promise<void>;
  isStartingCheckout: boolean;
  checkoutError: string | null;
}

export function useCheckout({
  workspaceHeaders,
  workspaceId = null,
  surface = "checkout",
}: UseCheckoutOptions): UseCheckoutState {
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const startCheckout = useCallback(async () => {
    if (!workspaceHeaders) {
      setCheckoutError("Create a workspace before subscribing.");
      return;
    }

    setCheckoutError(null);
    setIsStartingCheckout(true);

    trackEvent("paywall_subscribe_clicked", {
      surface,
      checkout_available: true,
    });

    try {
      const result = await apiJson<{ url: string }>("/api/billing/checkout", {
        method: "POST",
        workspaceHeaders,
      });

      if (workspaceId) {
        persistCheckoutWorkspaceId(workspaceId);
      }

      window.location.href = result.url;
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Could not start checkout.",
      );
    } finally {
      setIsStartingCheckout(false);
    }
  }, [surface, workspaceHeaders, workspaceId]);

  return { startCheckout, isStartingCheckout, checkoutError };
}
