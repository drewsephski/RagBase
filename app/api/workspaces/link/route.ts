import { NextRequest } from "next/server";
import { linkWorkspaceToAccount } from "@/lib/workspace/account";
import {
  authErrorResponse,
  requireWorkspace,
  WorkspaceAuthError,
} from "@/lib/workspace/auth";
import { handleRouteError } from "@/lib/api/errors";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    const linked = await linkWorkspaceToAccount(workspace.id);

    if (!linked) {
      return Response.json(
        { error: "Could not link workspace to your account." },
        { status: 403 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof WorkspaceAuthError) {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
