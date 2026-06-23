import { NextRequest } from "next/server";
import { z } from "zod";
import { captureServerAnalyticsEvent } from "@/lib/analytics/server";
import {
  buildSubscriptionStatusResponse,
  fetchWorkspaceBilling,
} from "@/lib/billing/subscription-status";
import {
  CheckoutSessionError,
  syncWorkspaceFromCheckoutSession,
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

const confirmBodySchema = z.object({
  sessionId: z.string().trim().min(1),
});

export async function POST(request: NextRequest): Promise<Response> {
  if (!isBillingEnabled()) {
    return Response.json({ error: "Billing is not enabled." }, { status: 503 });
  }

  try {
    const workspace = await requireWorkspace(request);
    const body = confirmBodySchema.parse(await request.json());
    const supabase = createServiceClient();
    const stripe = getStripeClient();

    const { activated } = await syncWorkspaceFromCheckoutSession(
      supabase,
      stripe,
      body.sessionId,
      workspace.id,
    );

    const billingRow = await fetchWorkspaceBilling(supabase, workspace.id);
    if (!billingRow) {
      return Response.json({ error: "Workspace not found" }, { status: 404 });
    }

    const subscription = buildSubscriptionStatusResponse(billingRow);

    if (activated || subscription.isProActive) {
      await captureServerAnalyticsEvent({
        event: "checkout_confirmed",
        timestamp: Date.now(),
        properties: {
          workspace_id: workspace.id,
          activated,
        },
      });
    }

    return Response.json({
      activated,
      subscription,
    });
  } catch (error) {
    if (error instanceof WorkspaceAuthError) {
      return authErrorResponse(error);
    }

    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid checkout session." }, { status: 400 });
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

    console.error("Checkout confirmation failed:", error);
    return Response.json(
      {
        error: "Could not confirm checkout. Please try again or contact support.",
        supportEmail: getSupportEmail(),
      },
      { status: 502 },
    );
  }
}
