import { listCrawlPages } from "@/lib/ingestion/crawl/page-ingest";
import { parseCrawlMetadata } from "@/lib/ingestion/crawl/types";
import { fetchSourceInWorkspace } from "@/lib/supabase/workspace-scope";
import { jsonError } from "@/lib/api/errors";
import { withSourceRoute } from "@/lib/api/source-route";

export const GET = withSourceRoute(async (_request, { workspace, sourceId, supabase }) => {
  const sourceResult = await fetchSourceInWorkspace<{
    id: string;
    metadata: Record<string, unknown> | null;
  }>(supabase, workspace.id, sourceId, "id, metadata", "Failed to fetch crawl pages");

  if ("response" in sourceResult) {
    return sourceResult.response;
  }

  const crawlMeta = parseCrawlMetadata(sourceResult.source.metadata);

  if (!crawlMeta) {
    return jsonError("This source is not a site crawl", 400);
  }

  const pages = await listCrawlPages(sourceId);

  return Response.json({ pages, crawl: crawlMeta });
});
