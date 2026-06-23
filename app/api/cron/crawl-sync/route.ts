import { NextRequest } from "next/server";
import { jsonError } from "@/lib/api/errors";
import { handleCronRoute } from "@/lib/api/cron-route";
import { syncActiveCrawlsForWorkspace } from "@/lib/ingestion/crawl/sync";
import { createServiceClient } from "@/lib/supabase/server";

async function runCrawlSync(): Promise<Response> {
  const supabase = createServiceClient();

  const { data: sources, error } = await supabase
    .from("sources")
    .select("workspace_id, metadata, status")
    .in("status", ["pending", "processing"]);

  if (error) {
    return jsonError("Failed to list active crawls", 500);
  }

  const workspaceIds = new Set<string>();

  for (const source of sources ?? []) {
    const metadata = source.metadata;
    if (
      metadata &&
      typeof metadata === "object" &&
      (metadata as Record<string, unknown>).mode === "crawl"
    ) {
      workspaceIds.add(source.workspace_id);
    }
  }

  for (const workspaceId of workspaceIds) {
    await syncActiveCrawlsForWorkspace(workspaceId);
  }

  return Response.json({
    success: true,
    workspacesSynced: workspaceIds.size,
  });
}

export async function GET(request: NextRequest): Promise<Response> {
  return handleCronRoute(request, runCrawlSync, "Crawl sync failed");
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCronRoute(request, runCrawlSync, "Crawl sync failed");
}
