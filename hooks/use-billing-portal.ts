"use client";

import { useCallback, useState } from "react";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { apiJson } from "@/lib/api/client";
import { trackEvent } from "@/lib/analytics/track";

interface UseBillingPortalOptions {
  workspaceHeaders: WorkspaceHeaders | null;
  surface?: string;
}

interface UseBillingPortalState {
  openPortal: () => Promise<void>;
  isOpeningPortal: boolean;
  portalError: string | null;
}

export function useBillingPortal({
  workspaceHeaders,
  surface = "billing",
}: UseBillingPortalOptions): UseBillingPortalState {
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const openPortal = useCallback(async () => {
    if (!workspaceHeaders) {
      return;
    }

    setPortalError(null);
    setIsOpeningPortal(true);

    trackEvent("billing_portal_opened", { surface });

    try {
      const result = await apiJson<{ url: string }>("/api/billing/portal", {
        method: "POST",
        workspaceHeaders,
      });

      window.location.href = result.url;
    } catch (error) {
      setPortalError(
        error instanceof Error ? error.message : "Could not open billing portal.",
      );
    } finally {
      setIsOpeningPortal(false);
    }
  }, [surface, workspaceHeaders]);

  return { openPortal, isOpeningPortal, portalError };
}
