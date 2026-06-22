import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireWorkspace,
} from "@/lib/workspace/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: source, error } = await supabase
      .from("sources")
      .select("id, name, type, status, error_message, metadata, created_at")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (error) {
      return jsonError("Failed to fetch source status", 500);
    }

    if (!source) {
      return jsonError("Source not found", 404);
    }

    return Response.json({ source });
  } catch (error) {
    if (error instanceof Error && error.name === "WorkspaceAuthError") {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
