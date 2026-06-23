import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireWorkspace,
} from "@/lib/workspace/auth";
import { fetchWorkspaceMessages } from "@/lib/chat/messages";
import { handleRouteError } from "@/lib/api/errors";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    const messages = await fetchWorkspaceMessages(workspace.id);

    return Response.json({ messages });
  } catch (error) {
    if (error instanceof Error && error.name === "WorkspaceAuthError") {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
