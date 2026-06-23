import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireWorkspace,
  WorkspaceAuthError,
} from "@/lib/workspace/auth";
import { listCrawlPages } from "@/lib/ingestion/crawl/page-ingest";
import { parseCrawlMetadata } from "@/lib/ingestion/crawl/types";
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
      .select("id, metadata")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (error) {
      return jsonError("Failed to fetch crawl pages", 500);
    }

    if (!source) {
      return jsonError("Source not found", 404);
    }

    const crawlMeta = parseCrawlMetadata(
      source.metadata as Record<string, unknown> | null,
    );

    if (!crawlMeta) {
      return jsonError("This source is not a site crawl", 400);
    }

    const pages = await listCrawlPages(id);

    return Response.json({ pages, crawl: crawlMeta });
  } catch (error) {
    if (error instanceof WorkspaceAuthError) {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
