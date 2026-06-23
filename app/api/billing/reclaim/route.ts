import { NextRequest } from "next/server";
import {
  buildSubscriptionStatusResponse,
  fetchWorkspaceBilling,
} from "@/lib/billing/subscription-status";
import {
  reclaimOrphanSubscriptionForWorkspace,
  SubscriptionReclaimError,
} from "@/lib/billing/reclaim-subscription";
import { isBillingEnabled } from "@/lib/billing/flags";
import { createServiceClient } from "@/lib/supabase/server";
import {
  AuthenticationRequiredError,
  requireAuthenticatedUser,
} from "@/lib/supabase/require-auth";
import {
  authErrorResponse,
  requireWorkspace,
  WorkspaceAuthError,
} from "@/lib/workspace/auth";
import { handleRouteError } from "@/lib/api/errors";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  if (!isBillingEnabled()) {
    return Response.json({ error: "Billing is not enabled." }, { status: 503 });
  }

  try {
    const workspace = await requireWorkspace(request);
    const user = await requireAuthenticatedUser();
    if (!user) {
      throw new AuthenticationRequiredError();
    }

    const supabase = createServiceClient();

    const { reclaimed } = await reclaimOrphanSubscriptionForWorkspace(
      supabase,
      workspace.id,
      user.id,
      user.email,
    );

    const billingRow = await fetchWorkspaceBilling(supabase, workspace.id);
    if (!billingRow) {
      return Response.json({ error: "Workspace not found" }, { status: 404 });
    }

    return Response.json({
      reclaimed,
      subscription: buildSubscriptionStatusResponse(billingRow),
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    if (error instanceof WorkspaceAuthError) {
      return authErrorResponse(error);
    }

    if (error instanceof SubscriptionReclaimError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    return handleRouteError(error);
  }
}
