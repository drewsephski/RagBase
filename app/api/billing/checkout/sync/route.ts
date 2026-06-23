import { NextRequest } from "next/server";
import {
  buildSubscriptionStatusResponse,
  fetchWorkspaceBilling,
} from "@/lib/billing/subscription-status";
import {
  CheckoutSessionError,
  syncLatestCompletedCheckoutForWorkspace,
} from "@/lib/billing/checkout-session";
import { isBillingEnabled } from "@/lib/billing/flags";
import { getSupportEmail } from "@/lib/support";
import {
  authErrorResponse,
  requireWorkspace,
  WorkspaceAuthError,
} from "@/lib/workspace/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  if (!isBillingEnabled()) {
    return Response.json({ error: "Billing is not enabled." }, { status: 503 });
  }

  try {
    const workspace = await requireWorkspace(request);
    const supabase = createServiceClient();
    const stripe = getStripeClient();

    const { activated } = await syncLatestCompletedCheckoutForWorkspace(
      supabase,
      stripe,
      workspace.id,
    );

    const billingRow = await fetchWorkspaceBilling(supabase, workspace.id);
    if (!billingRow) {
      return Response.json({ error: "Workspace not found" }, { status: 404 });
    }

    return Response.json({
      activated,
      subscription: buildSubscriptionStatusResponse(billingRow),
    });
  } catch (error) {
    if (error instanceof WorkspaceAuthError) {
      return authErrorResponse(error);
    }

    if (error instanceof CheckoutSessionError) {
      return Response.json(
        {
          error: error.message,
          supportEmail: getSupportEmail(),
        },
        { status: error.status },
      );
    }

    console.error("Checkout sync failed:", error);
    return Response.json(
      {
        error: "Could not sync checkout. Please try again or contact support.",
        supportEmail: getSupportEmail(),
      },
      { status: 502 },
    );
  }
}
