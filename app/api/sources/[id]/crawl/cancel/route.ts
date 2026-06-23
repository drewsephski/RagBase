import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireWorkspace,
  WorkspaceAuthError,
} from "@/lib/workspace/auth";
import { cancelCrawlSource } from "@/lib/ingestion/crawl/sync";
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

    try {
      await cancelCrawlSource(id, workspace.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not cancel crawl";
      return jsonError(message, 400);
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof WorkspaceAuthError) {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
