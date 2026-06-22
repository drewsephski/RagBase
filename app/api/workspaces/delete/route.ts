import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireWorkspace,
  WorkspaceAuthError,
} from "@/lib/workspace/auth";
import { deleteWorkspace } from "@/lib/workspace/delete";
import { handleRouteError } from "@/lib/api/errors";

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    await deleteWorkspace(workspace.id);

    return Response.json({
      success: true,
      deletedWorkspaceId: workspace.id,
    });
  } catch (error) {
    if (error instanceof WorkspaceAuthError) {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
