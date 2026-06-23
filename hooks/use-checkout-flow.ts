"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { useSubscription } from "@/hooks/use-subscription";
import {
  isRecoveryConfirmedLocally,
  setRecoveryConfirmedLocally,
} from "@/lib/billing/recovery-state";
import {
  clearCheckoutReturnParams,
  clearCheckoutWorkspaceId,
  isCheckoutSessionHandled,
  isSameAppHostname,
  markCheckoutSessionHandled,
  readCheckoutWorkspaceId,
  redirectToCanonicalCheckoutReturn,
  type CheckoutReturnParams,
} from "@/lib/billing/checkout-return-state";
import { trackEvent } from "@/lib/analytics/track";
import type { SubscriptionStatusResponse } from "@/lib/billing/types";

export type CheckoutReturnPhase =
  | "idle"
  | "redirecting"
  | "activating"
  | "recovery"
  | "done";

interface UseCheckoutFlowOptions {
  initialReturn: CheckoutReturnParams;
  headers: WorkspaceHeaders | null;
  activeWorkspaceId: string | null;
  isReady: boolean;
  onSwitchWorkspace: (workspaceId: string) => void;
}

interface UseCheckoutFlowState {
  subscription: SubscriptionStatusResponse | null;
  isPendingActivation: boolean;
  phase: CheckoutReturnPhase;
  showRecovery: boolean;
  isBlockingUi: boolean;
  timedOut: boolean;
  refreshSubscription: () => Promise<void>;
  completeRecovery: () => void;
  deferRecovery: () => void;
}

export function useCheckoutFlow({
  initialReturn,
  headers,
  activeWorkspaceId,
  isReady,
  onSwitchWorkspace,
}: UseCheckoutFlowOptions): UseCheckoutFlowState {
  const isSuccessReturn = initialReturn.status === "success";
  const sessionId = initialReturn.sessionId;

  const [phase, setPhase] = useState<CheckoutReturnPhase>("idle");
  const [showRecovery, setShowRecovery] = useState(false);
  const cancelHandledRef = useRef(initialReturn.status !== "cancel");
  const workspaceAlignedRef = useRef(false);
  const completionStartedRef = useRef(false);
  const checkoutStartedRef = useRef(false);

  useEffect(() => {
    if (!isSuccessReturn || checkoutStartedRef.current || typeof window === "undefined") {
      return;
    }

    checkoutStartedRef.current = true;

    if (sessionId && isCheckoutSessionHandled(sessionId)) {
      completionStartedRef.current = true;
      setPhase("done");
      return;
    }

    if (!isSameAppHostname(window.location.hostname)) {
      setPhase("redirecting");
      redirectToCanonicalCheckoutReturn(window.location.pathname, window.location.search);
      return;
    }

    setPhase("activating");
  }, [isSuccessReturn, sessionId]);

  const shouldPoll =
    isSuccessReturn &&
    phase === "activating" &&
    isReady &&
    Boolean(headers) &&
    Boolean(activeWorkspaceId);

  const {
    subscription,
    isPendingActivation,
    refresh: refreshSubscription,
  } = useSubscription({
    headers,
    enabled: isReady && Boolean(headers),
    pollWhilePending: shouldPoll,
    checkoutSessionId: sessionId,
  });

  useEffect(() => {
    if (initialReturn.status !== "cancel" || cancelHandledRef.current) {
      return;
    }

    cancelHandledRef.current = true;
    clearCheckoutReturnParams();
    clearCheckoutWorkspaceId();
  }, [initialReturn.status]);

  useEffect(() => {
    if (!isSuccessReturn || !isReady || workspaceAlignedRef.current) {
      return;
    }

    const checkoutWorkspaceId = readCheckoutWorkspaceId();
    if (
      checkoutWorkspaceId &&
      activeWorkspaceId &&
      checkoutWorkspaceId !== activeWorkspaceId
    ) {
      onSwitchWorkspace(checkoutWorkspaceId);
    }

    workspaceAlignedRef.current = true;
  }, [activeWorkspaceId, isReady, isSuccessReturn, onSwitchWorkspace]);

  const completeCheckout = useCallback(() => {
    if (completionStartedRef.current) {
      return;
    }

    completionStartedRef.current = true;

    if (sessionId) {
      markCheckoutSessionHandled(sessionId);
    }

    clearCheckoutReturnParams();
    clearCheckoutWorkspaceId();

    if (!activeWorkspaceId) {
      setPhase("done");
      return;
    }

    const confirmed =
      subscription?.recoveryLinkConfirmed ||
      isRecoveryConfirmedLocally(activeWorkspaceId);

    if (confirmed) {
      setPhase("done");
      return;
    }

    setShowRecovery(true);
    setPhase("recovery");
  }, [activeWorkspaceId, sessionId, subscription?.recoveryLinkConfirmed]);

  useEffect(() => {
    if (phase !== "activating" || !subscription?.isProActive) {
      return;
    }

    completeCheckout();
  }, [completeCheckout, phase, subscription?.isProActive]);

  const timedOut =
    phase === "activating" &&
    isReady &&
    !isPendingActivation &&
    !subscription?.isProActive;

  useEffect(() => {
    if (timedOut) {
      trackEvent("checkout_success_resolved", {
        resolved: false,
        source: "checkout_return_timeout",
      });
    }
  }, [timedOut]);

  const completeRecovery = useCallback(() => {
    if (activeWorkspaceId) {
      setRecoveryConfirmedLocally(activeWorkspaceId);
    }

    setShowRecovery(false);
    setPhase("done");
    void refreshSubscription();
  }, [activeWorkspaceId, refreshSubscription]);

  const deferRecovery = useCallback(() => {
    setShowRecovery(false);
    setPhase("done");
  }, []);

  const isBlockingUi =
    phase === "redirecting" ||
    phase === "activating" ||
    (phase === "recovery" && showRecovery);

  return {
    subscription,
    isPendingActivation,
    phase,
    showRecovery,
    isBlockingUi,
    timedOut,
    refreshSubscription,
    completeRecovery,
    deferRecovery,
  };
}
