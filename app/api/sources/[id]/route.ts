import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireWorkspace,
} from "@/lib/workspace/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";

const UPLOADS_BUCKET = "uploads";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: source, error } = await supabase
      .from("sources")
      .select("id, storage_path")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (error) {
      return jsonError("Failed to fetch source", 500);
    }

    if (!source) {
      return jsonError("Source not found", 404);
    }

    if (source.storage_path) {
      const { error: storageError } = await supabase.storage
        .from(UPLOADS_BUCKET)
        .remove([source.storage_path]);

      if (storageError) {
        console.error("Failed to remove source storage:", storageError);
      }
    }

    const { error: deleteError } = await supabase
      .from("sources")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspace.id);

    if (deleteError) {
      return jsonError("Failed to delete source", 500);
    }

    return Response.json({ success: true, sourceId: id });
  } catch (error) {
    if (error instanceof Error && error.name === "WorkspaceAuthError") {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
