import { z } from "zod";
import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireWorkspace,
  WorkspaceAuthError,
} from "@/lib/workspace/auth";
import { deleteWorkspace } from "@/lib/workspace/delete";
import { WorkspaceDeleteError } from "@/lib/workspace/delete-errors";
import { handleRouteError } from "@/lib/api/errors";

const deleteBodySchema = z.object({
  cancelSubscription: z.boolean().optional(),
});

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    const body = deleteBodySchema.safeParse(
      await request.json().catch(() => ({})),
    );
    const cancelSubscription = body.success
      ? body.data.cancelSubscription ?? false
      : false;

    await deleteWorkspace(workspace.id, { cancelSubscription });

    return Response.json({
      success: true,
      deletedWorkspaceId: workspace.id,
    });
  } catch (error) {
    if (error instanceof WorkspaceAuthError) {
      return authErrorResponse(error);
    }

    if (error instanceof WorkspaceDeleteError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    return handleRouteError(error);
  }
}
