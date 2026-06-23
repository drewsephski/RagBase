import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authErrorResponse,
  requireWorkspace,
  WorkspaceAuthError,
} from "@/lib/workspace/auth";
import { startSiteCrawl } from "@/lib/ingestion/crawl/start";
import { fetchSourceIngestionSnapshot } from "@/lib/api/source-ingestion";
import { UrlScrapeError } from "@/lib/ingestion/url-utils";
import { enforceUrlIngestRateLimit } from "@/lib/rate-limit/enforce";
import { handleRouteError, jsonError } from "@/lib/api/errors";

const crawlBodySchema = z.object({
  url: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    await enforceUrlIngestRateLimit(request, workspace.id);

    const body: unknown = await request.json();
    const parsed = crawlBodySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid URL", 400);
    }

    const result = await startSiteCrawl({
      workspaceId: workspace.id,
      url: parsed.data.url,
    });

    const source = await fetchSourceIngestionSnapshot(result.sourceId);

    return Response.json(
      {
        source: source ?? {
          id: result.sourceId,
          name: result.name,
          status: result.status,
          type: "url",
          created_at: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof WorkspaceAuthError) {
      return authErrorResponse(error);
    }
    if (error instanceof UrlScrapeError) {
      return jsonError(error.message, 400);
    }
    return handleRouteError(error);
  }
}
