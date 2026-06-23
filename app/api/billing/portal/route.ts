import { NextRequest } from "next/server";
import { captureServerAnalyticsEvent } from "@/lib/analytics/server";
import { fetchWorkspaceBilling } from "@/lib/billing/subscription-status";
import { createBillingPortalSession } from "@/lib/billing/portal";
import { getSupportEmail } from "@/lib/support";
import {
  authErrorResponse,
  requireWorkspace,
  WorkspaceAuthError,
} from "@/lib/workspace/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    const supabase = createServiceClient();
    const billing = await fetchWorkspaceBilling(supabase, workspace.id);

    if (!billing?.stripe_customer_id) {
      return Response.json(
        {
          error: "Billing is not available for this workspace yet.",
          supportEmail: getSupportEmail(),
        },
        { status: 404 },
      );
    }

    const session = await createBillingPortalSession(billing.stripe_customer_id);

    await captureServerAnalyticsEvent({
      event: "billing_portal_opened",
      timestamp: Date.now(),
    });

    return Response.json({ url: session.url });
  } catch (error) {
    await captureServerAnalyticsEvent({
      event: "billing_portal_failed",
      timestamp: Date.now(),
    });

    if (error instanceof WorkspaceAuthError) {
      return authErrorResponse(error);
    }

    console.error("Billing portal session failed:", error);
    return Response.json(
      {
        error: "Could not open billing portal. Please try again or contact support.",
        supportEmail: getSupportEmail(),
      },
      { status: 502 },
    );
  }
}
