import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireWorkspace,
} from "@/lib/workspace/auth";
import { executeSourceIngestion } from "@/lib/api/source-ingestion";
import { createServiceClient } from "@/lib/supabase/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { parseOpenRouterKey } from "@/lib/openrouter/parse-request-key";

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

    const openRouterKey =
      request.headers.get("content-type")?.includes("application/json")
        ? parseOpenRouterKey(await request.json())
        : undefined;

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

    const result = await executeSourceIngestion(id, { openRouterKey });

    if (!result.source) {
      return jsonError("Failed to fetch source after reprocess", 500);
    }

    return Response.json({
      success: result.success,
      source: result.source,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "WorkspaceAuthError") {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
