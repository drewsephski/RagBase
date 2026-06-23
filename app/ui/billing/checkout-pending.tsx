"use client";

import { Loader2 } from "lucide-react";
import { supportMailto } from "@/lib/support";
import { Button } from "@/components/ui/button";

interface CheckoutPendingProps {
  onRefresh: () => void;
  timedOut: boolean;
}

export function CheckoutPending({ onRefresh, timedOut }: CheckoutPendingProps) {
  return (
    <div
      className="bg-background/95 fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
      role="dialog"
      aria-labelledby="checkout-pending-title"
      aria-modal="true"
    >
      <div className="border-border bg-card w-full max-w-md rounded-xl border p-6 text-center shadow-lg">
        {!timedOut ? (
          <>
            <Loader2
              className="text-primary mx-auto mb-4 size-8 animate-spin"
              aria-hidden
            />
            <h2 id="checkout-pending-title" className="text-lg font-semibold">
              Payment received
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Activating your Pro workspace…
            </p>
          </>
        ) : (
          <>
            <h2 id="checkout-pending-title" className="text-lg font-semibold">
              Still syncing
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              You can refresh in a moment or contact support if Pro access does not
              appear.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={onRefresh}>
                Refresh status
              </Button>
              <Button type="button" variant="outline" asChild>
                <a href={supportMailto("Pro activation pending")}>Contact support</a>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
