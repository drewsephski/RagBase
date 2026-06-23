"use client";

import { useCallback, useState } from "react";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { ApiError } from "@/lib/api/api-error";
import { apiJson } from "@/lib/api/client";
import { trackEvent } from "@/lib/analytics/track";
import { persistCheckoutWorkspaceId } from "@/lib/billing/checkout-return-state";

interface UseCheckoutOptions {
  workspaceHeaders: WorkspaceHeaders | null;
  workspaceId?: string | null;
  surface?: string;
  isAuthenticated?: boolean;
  isAuthLoading?: boolean;
  onAuthenticationRequired?: () => void;
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
  isAuthenticated = true,
  isAuthLoading = false,
  onAuthenticationRequired,
}: UseCheckoutOptions): UseCheckoutState {
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const startCheckout = useCallback(async () => {
    if (!workspaceHeaders) {
      setCheckoutError("Create a workspace before subscribing.");
      return;
    }

    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      setCheckoutError("Sign in to subscribe — your Pro plan stays linked to your account.");
      onAuthenticationRequired?.();
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
      if (error instanceof ApiError && error.status === 401) {
        setCheckoutError(
          "Sign in to subscribe — your Pro plan stays linked to your account.",
        );
        onAuthenticationRequired?.();
        return;
      }

      setCheckoutError(
        error instanceof Error ? error.message : "Could not start checkout.",
      );
    } finally {
      setIsStartingCheckout(false);
    }
  }, [
    isAuthLoading,
    isAuthenticated,
    onAuthenticationRequired,
    surface,
    workspaceHeaders,
    workspaceId,
  ]);

  return { startCheckout, isStartingCheckout, checkoutError };
}
