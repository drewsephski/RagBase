import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireWorkspace,
} from "@/lib/workspace/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    const supabase = createServiceClient();

    const { data: sources, error } = await supabase
      .from("sources")
      .select("id, name, type, status, error_message, metadata, created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: true });

    if (error) {
      return jsonError("Failed to fetch sources", 500);
    }

    return Response.json({ sources: sources ?? [] });
  } catch (error) {
    if (error instanceof Error && error.name === "WorkspaceAuthError") {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
