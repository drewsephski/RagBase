import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireWorkspace,
} from "@/lib/workspace/auth";
import {
  WORKSPACE_ID_KEY,
  WORKSPACE_SECRET_KEY,
  OPENROUTER_KEY,
  SELECTED_MODEL_KEY,
} from "@/lib/workspace/crypto";
import { deleteWorkspace } from "@/lib/workspace/delete";
import { handleRouteError } from "@/lib/api/errors";

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    await deleteWorkspace(workspace.id);

    return Response.json({
      success: true,
      localStorageKeys: [
        WORKSPACE_ID_KEY,
        WORKSPACE_SECRET_KEY,
        OPENROUTER_KEY,
        SELECTED_MODEL_KEY,
      ],
      message:
        "Workspace deleted. Clear the listed localStorage keys and refresh.",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "WorkspaceAuthError") {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
