"use client";

import { Loader2 } from "lucide-react";
import type { UseWorkspacesState } from "@/hooks/use-workspace";
import type { useCheckoutFlow } from "@/hooks/use-checkout-flow";
import { CheckoutPending } from "@/app/ui/billing/checkout-pending";
import { RecoverySetup } from "@/app/ui/billing/recovery-setup";

type CheckoutFlowState = ReturnType<typeof useCheckoutFlow>;

interface CheckoutReturnHostProps {
  checkoutFlow: CheckoutFlowState;
  workspace: UseWorkspacesState;
}

export function CheckoutReturnHost({
  checkoutFlow,
  workspace,
}: CheckoutReturnHostProps) {
  const { headers, activeWorkspace } = workspace;
  const activeWorkspaceId = activeWorkspace?.id ?? null;

  if (!checkoutFlow.isBlockingUi) {
    return null;
  }

  return (
    <>
      {checkoutFlow.phase === "redirecting" ? (
        <div
          className="bg-background/95 fixed inset-0 z-[60] flex items-center justify-center px-4 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            Returning to RagBase…
          </div>
        </div>
      ) : null}

      {checkoutFlow.phase === "activating" ? (
        <CheckoutPending
          timedOut={checkoutFlow.timedOut}
          onRefresh={() => void checkoutFlow.refreshSubscription()}
        />
      ) : null}

      {checkoutFlow.showRecovery && headers && activeWorkspaceId ? (
        <RecoverySetup
          workspaceId={activeWorkspaceId}
          workspaceHeaders={headers}
          context="pro_checkout"
          onComplete={checkoutFlow.completeRecovery}
          onDefer={checkoutFlow.deferRecovery}
        />
      ) : null}
    </>
  );
}
