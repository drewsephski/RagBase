import { NextRequest } from "next/server";
import {
  buildSubscriptionStatusResponse,
  fetchWorkspaceBilling,
} from "@/lib/billing/subscription-status";
import {
  authErrorResponse,
  requireWorkspace,
  WorkspaceAuthError,
} from "@/lib/workspace/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { handleRouteError } from "@/lib/api/errors";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    const supabase = createServiceClient();
    const billingRow = await fetchWorkspaceBilling(supabase, workspace.id);

    if (!billingRow) {
      return Response.json({ error: "Workspace not found" }, { status: 404 });
    }

    return Response.json(buildSubscriptionStatusResponse(billingRow));
  } catch (error) {
    if (error instanceof WorkspaceAuthError) {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
