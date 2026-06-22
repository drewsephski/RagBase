import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireWorkspace,
} from "@/lib/workspace/auth";
import { reprocessSource } from "@/lib/ingestion/pipeline";
import { createServiceClient } from "@/lib/supabase/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: source, error } = await supabase
      .from("sources")
      .select("id")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (error) {
      return jsonError("Failed to fetch source", 500);
    }

    if (!source) {
      return jsonError("Source not found", 404);
    }

    await reprocessSource(id);

    return Response.json({
      success: true,
      sourceId: id,
      status: "processing",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "WorkspaceAuthError") {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
