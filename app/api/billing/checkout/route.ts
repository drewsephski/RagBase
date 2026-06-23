import { NextRequest } from "next/server";
import { captureServerAnalyticsEvent } from "@/lib/analytics/server";
import {
  CheckoutSessionError,
  createProCheckoutSession,
} from "@/lib/billing/checkout-session";
import { isBillingEnabled } from "@/lib/billing/flags";
import { resolveCheckoutStripeCustomerId } from "@/lib/billing/reclaim-subscription";
import { getSupportEmail } from "@/lib/support";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase/env";
import {
  AuthenticationRequiredError,
  requireAuthenticatedUser,
} from "@/lib/supabase/require-auth";
import { linkWorkspaceToAccount } from "@/lib/workspace/account";
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

    if (isSupabaseAuthConfigured()) {
      const user = await requireAuthenticatedUser();
      const linked = await linkWorkspaceToAccount(workspace.id);
      if (!linked) {
        return Response.json(
          {
            error: "Could not link this workspace to your account.",
            code: "workspace_link_failed",
          },
          { status: 403 },
        );
      }

      const supabase = createServiceClient();
      const stripeCustomerId = user
        ? await resolveCheckoutStripeCustomerId(
            supabase,
            user.id,
            user.email,
          )
        : null;

      const session = await createProCheckoutSession(workspace.id, {
        customerEmail: user?.email,
        stripeCustomerId,
      });

      if (!session.url) {
        return Response.json(
          { error: "Could not start checkout. Please try again." },
          { status: 502 },
        );
      }

      await captureServerAnalyticsEvent({
        event: "checkout_session_created",
        timestamp: Date.now(),
        properties: {
          workspace_id: workspace.id,
          authenticated: true,
        },
      });

      return Response.json({ url: session.url, sessionId: session.id });
    }

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
      properties: { workspace_id: workspace.id, authenticated: false },
    });

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    await captureServerAnalyticsEvent({
      event: "checkout_session_failed",
      timestamp: Date.now(),
    });

    if (error instanceof AuthenticationRequiredError) {
      return Response.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      );
    }

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
