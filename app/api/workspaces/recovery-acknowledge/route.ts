import { NextRequest } from "next/server";
import { authErrorResponse, requireWorkspace, WorkspaceAuthError } from "@/lib/workspace/auth";
import { handleRouteError } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("workspaces")
      .update({ recovery_acknowledged_at: new Date().toISOString() })
      .eq("id", workspace.id);

    if (error) {
      console.error("Failed to acknowledge recovery link:", error);
      return Response.json({ error: "Failed to save recovery confirmation" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof WorkspaceAuthError) {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
