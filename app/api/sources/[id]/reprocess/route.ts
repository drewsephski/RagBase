import { executeSourceIngestion } from "@/lib/api/source-ingestion";
import { fetchSourceInWorkspace } from "@/lib/supabase/workspace-scope";
import { jsonError } from "@/lib/api/errors";
import { withSourceRoute } from "@/lib/api/source-route";
import { parseOpenRouterKey } from "@/lib/openrouter/parse-request-key";

export const POST = withSourceRoute(async (request, { workspace, sourceId, supabase }) => {
  const openRouterKey =
    request.headers.get("content-type")?.includes("application/json")
      ? parseOpenRouterKey(await request.json())
      : undefined;

  const sourceResult = await fetchSourceInWorkspace<{ id: string }>(
    supabase,
    workspace.id,
    sourceId,
    "id",
    "Failed to fetch source",
  );

  if ("response" in sourceResult) {
    return sourceResult.response;
  }

  const result = await executeSourceIngestion(sourceId, { openRouterKey });

  if (!result.source) {
    return jsonError("Failed to fetch source after reprocess", 500);
  }

  return Response.json({
    success: result.success,
    source: result.source,
  });
});
