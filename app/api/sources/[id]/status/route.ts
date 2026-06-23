import { syncCrawlSource } from "@/lib/ingestion/crawl/sync";
import { parseCrawlMetadata } from "@/lib/ingestion/crawl/types";
import { fetchSourceInWorkspace } from "@/lib/supabase/workspace-scope";
import { withSourceRoute } from "@/lib/api/source-route";

export const GET = withSourceRoute(async (_request, { workspace, sourceId, supabase }) => {
  const sourceResult = await fetchSourceInWorkspace<{
    id: string;
    name: string;
    type: string;
    status: string;
    error_message: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>(
    supabase,
    workspace.id,
    sourceId,
    "id, name, type, status, error_message, metadata, created_at",
    "Failed to fetch source status",
  );

  if ("response" in sourceResult) {
    return sourceResult.response;
  }

  const { source } = sourceResult;
  const crawlMeta = parseCrawlMetadata(source.metadata);

  if (
    crawlMeta &&
    !["ready", "failed", "canceled"].includes(crawlMeta.crawlStatus)
  ) {
    await syncCrawlSource(sourceId);

    const refreshedResult = await fetchSourceInWorkspace<typeof source>(
      supabase,
      workspace.id,
      sourceId,
      "id, name, type, status, error_message, metadata, created_at",
      "Failed to fetch source status",
    );

    if ("source" in refreshedResult) {
      return Response.json({ source: refreshedResult.source });
    }
  }

  return Response.json({ source });
});
