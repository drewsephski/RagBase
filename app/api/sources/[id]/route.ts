import { fetchSourceInWorkspace } from "@/lib/supabase/workspace-scope";
import { jsonError } from "@/lib/api/errors";
import { withSourceRoute } from "@/lib/api/source-route";

const UPLOADS_BUCKET = "uploads";

export const DELETE = withSourceRoute(async (_request, { workspace, sourceId, supabase }) => {
  const sourceResult = await fetchSourceInWorkspace<{
    id: string;
    storage_path: string | null;
  }>(supabase, workspace.id, sourceId, "id, storage_path", "Failed to fetch source");

  if ("response" in sourceResult) {
    return sourceResult.response;
  }

  const { source } = sourceResult;

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
    .eq("id", sourceId)
    .eq("workspace_id", workspace.id);

  if (deleteError) {
    return jsonError("Failed to delete source", 500);
  }

  return Response.json({ success: true, sourceId });
});
