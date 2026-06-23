import { NextRequest } from "next/server";
import { z } from "zod";
import { captureServerAnalyticsEvent } from "@/lib/analytics/server";
import { handleRouteError } from "@/lib/api/errors";
import {
  authErrorResponse,
  requireWorkspace,
  WorkspaceAuthError,
} from "@/lib/workspace/auth";
import { createRecoveryLink, revokeRecoveryLinks } from "@/lib/workspace/recovery";
import { enforceRecoveryCreateRateLimit } from "@/lib/rate-limit/enforce";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    await enforceRecoveryCreateRateLimit(request, workspace.id);

    const supabase = createServiceClient();
    const result = await createRecoveryLink(supabase, workspace.id);

    await captureServerAnalyticsEvent({
      event: "recovery_link_generated",
      properties: { has_pro_workspace: true },
      timestamp: Date.now(),
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof WorkspaceAuthError) {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}

const deleteBodySchema = z.object({
  revokeAll: z.literal(true).optional(),
});

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    const body: unknown = await request.json().catch(() => ({}));
    deleteBodySchema.parse(body);

    const supabase = createServiceClient();
    await revokeRecoveryLinks(supabase, workspace.id);

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof WorkspaceAuthError) {
      return authErrorResponse(error);
    }
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    return handleRouteError(error);
  }
}
