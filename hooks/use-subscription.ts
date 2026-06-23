"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { apiJson } from "@/lib/api/client";
import { trackEvent } from "@/lib/analytics/track";
import type { SubscriptionStatusResponse } from "@/lib/billing/types";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60_000;

interface UseSubscriptionOptions {
  headers: WorkspaceHeaders | null;
  enabled?: boolean;
  pollWhilePending?: boolean;
}

interface UseSubscriptionState {
  subscription: SubscriptionStatusResponse | null;
  isLoading: boolean;
  isPendingActivation: boolean;
  refresh: () => Promise<void>;
}

export function useSubscription({
  headers,
  enabled = true,
  pollWhilePending = false,
}: UseSubscriptionOptions): UseSubscriptionState {
  const [subscription, setSubscription] = useState<SubscriptionStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPendingActivation, setIsPendingActivation] = useState(false);
  const pollStartedAtRef = useRef<number | null>(null);

  const fetchSubscription = useCallback(async (): Promise<SubscriptionStatusResponse | null> => {
    if (!headers) {
      return null;
    }

    return await apiJson<SubscriptionStatusResponse>("/api/workspaces/subscription", {
      workspaceHeaders: headers,
    });
  }, [headers]);

  const refresh = useCallback(async () => {
    if (!enabled || !headers) {
      setSubscription(null);
      return;
    }

    setIsLoading(true);

    try {
      const next = await fetchSubscription();
      setSubscription(next);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, fetchSubscription, headers]);

  useEffect(() => {
    if (!enabled || !headers) {
      setSubscription(null);
      setIsPendingActivation(false);
      return;
    }

    void refresh();
  }, [enabled, headers, refresh]);

  useEffect(() => {
    if (!pollWhilePending || !headers) {
      pollStartedAtRef.current = null;
      setIsPendingActivation(false);
      return;
    }

    pollStartedAtRef.current = Date.now();
    setIsPendingActivation(true);
    trackEvent("checkout_success_pending", { started: true });

    let cancelled = false;

    const intervalId = window.setInterval(() => {
      void (async () => {
        const startedAt = pollStartedAtRef.current ?? Date.now();
        const elapsedMs = Date.now() - startedAt;

        try {
          const next = await fetchSubscription();
          if (cancelled) {
            return;
          }

          setSubscription(next);

          if (next?.isProActive) {
            window.clearInterval(intervalId);
            setIsPendingActivation(false);
            trackEvent("checkout_success_resolved", {
              resolved: true,
              elapsed_ms: elapsedMs,
            });
            return;
          }

          if (elapsedMs >= POLL_TIMEOUT_MS) {
            window.clearInterval(intervalId);
            setIsPendingActivation(false);
            trackEvent("checkout_success_resolved", {
              resolved: false,
              elapsed_ms: elapsedMs,
            });
          }
        } catch {
          if (elapsedMs >= POLL_TIMEOUT_MS) {
            window.clearInterval(intervalId);
            setIsPendingActivation(false);
          }
        }
      })();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [fetchSubscription, headers, pollWhilePending]);

  return {
    subscription,
    isLoading,
    isPendingActivation,
    refresh,
  };
}
