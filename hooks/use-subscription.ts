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
  checkoutSessionId?: string | null;
}

interface UseSubscriptionState {
  subscription: SubscriptionStatusResponse | null;
  isLoading: boolean;
  isPendingActivation: boolean;
  refresh: () => Promise<void>;
}

interface ConfirmCheckoutResponse {
  activated: boolean;
  subscription: SubscriptionStatusResponse;
}

async function syncCheckoutActivation(
  headers: WorkspaceHeaders,
  checkoutSessionId: string | null,
): Promise<SubscriptionStatusResponse | null> {
  if (checkoutSessionId) {
    try {
      const result = await apiJson<ConfirmCheckoutResponse>("/api/billing/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: checkoutSessionId }),
        workspaceHeaders: headers,
      });

      return result.subscription;
    } catch {
      return null;
    }
  }

  try {
    const result = await apiJson<ConfirmCheckoutResponse>("/api/billing/checkout/sync", {
      method: "POST",
      workspaceHeaders: headers,
    });

    return result.subscription;
  } catch {
    return null;
  }
}

export function useSubscription({
  headers,
  enabled = true,
  pollWhilePending = false,
  checkoutSessionId = null,
}: UseSubscriptionOptions): UseSubscriptionState {
  const [subscription, setSubscription] = useState<SubscriptionStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPendingActivation, setIsPendingActivation] = useState(false);
  const pollStartedAtRef = useRef<number | null>(null);
  const confirmAttemptedRef = useRef<string | null>(null);
  const subscriptionRef = useRef(subscription);

  subscriptionRef.current = subscription;

  const fetchSubscription = useCallback(async (): Promise<SubscriptionStatusResponse | null> => {
    if (!headers) {
      return null;
    }

    return await apiJson<SubscriptionStatusResponse>("/api/workspaces/subscription", {
      workspaceHeaders: headers,
    });
  }, [headers]);

  const confirmCheckoutSession = useCallback(async (): Promise<boolean> => {
    if (!headers) {
      return false;
    }

    const syncKey = checkoutSessionId ?? "latest";
    if (confirmAttemptedRef.current === syncKey) {
      return subscriptionRef.current?.isProActive ?? false;
    }

    confirmAttemptedRef.current = syncKey;

    const nextSubscription = await syncCheckoutActivation(headers, checkoutSessionId);
    if (!nextSubscription) {
      return false;
    }

    setSubscription(nextSubscription);
    return nextSubscription.isProActive;
  }, [checkoutSessionId, headers]);

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

    void (async () => {
      const confirmed = await confirmCheckoutSession();
      if (cancelled) {
        return;
      }

      if (confirmed) {
        setIsPendingActivation(false);
        trackEvent("checkout_success_resolved", {
          resolved: true,
          elapsed_ms: 0,
          source: "confirm",
        });
      }
    })();

    const intervalId = window.setInterval(() => {
      void (async () => {
        const startedAt = pollStartedAtRef.current ?? Date.now();
        const elapsedMs = Date.now() - startedAt;

        try {
          if (elapsedMs < POLL_TIMEOUT_MS) {
            const confirmed = await confirmCheckoutSession();
            if (cancelled) {
              return;
            }

            if (confirmed) {
              window.clearInterval(intervalId);
              setIsPendingActivation(false);
              trackEvent("checkout_success_resolved", {
                resolved: true,
                elapsed_ms: elapsedMs,
                source: "confirm_poll",
              });
              return;
            }
          }

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
              source: "subscription_poll",
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
  }, [checkoutSessionId, confirmCheckoutSession, fetchSubscription, headers, pollWhilePending]);

  return {
    subscription,
    isLoading,
    isPendingActivation,
    refresh,
  };
}
