import { NextRequest } from "next/server";
import { captureServerAnalyticsEvent } from "@/lib/analytics/server";
import {
  CheckoutSessionError,
  createProCheckoutSession,
} from "@/lib/billing/checkout-session";
import { isBillingEnabled } from "@/lib/billing/flags";
import { getSupportEmail } from "@/lib/support";
import {
  authErrorResponse,
  requireWorkspace,
  WorkspaceAuthError,
} from "@/lib/workspace/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  if (!isBillingEnabled()) {
    return Response.json({ error: "Billing is not enabled." }, { status: 503 });
  }

  try {
    const workspace = await requireWorkspace(request);
    const session = await createProCheckoutSession(workspace.id);

    if (!session.url) {
      return Response.json(
        { error: "Could not start checkout. Please try again." },
        { status: 502 },
      );
    }

    await captureServerAnalyticsEvent({
      event: "checkout_session_created",
      timestamp: Date.now(),
      properties: { workspace_id: workspace.id },
    });

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    await captureServerAnalyticsEvent({
      event: "checkout_session_failed",
      timestamp: Date.now(),
    });

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

    console.error("Checkout session creation failed:", error);
    return Response.json(
      {
        error: "Could not start checkout. Please try again or contact support.",
        supportEmail: getSupportEmail(),
      },
      { status: 502 },
    );
  }
}
