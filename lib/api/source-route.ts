import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireWorkspace, type WorkspaceContext } from "@/lib/workspace/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { handleWorkspaceRouteError } from "@/lib/api/errors";
import type { SourceRouteParams } from "@/lib/api/route-params";

interface SourceRouteContext {
  workspace: WorkspaceContext;
  sourceId: string;
  supabase: SupabaseClient;
}

export function withSourceRoute(
  handler: (
    request: NextRequest,
    context: SourceRouteContext,
  ) => Promise<Response>,
) {
  return async function sourceRouteHandler(
    request: NextRequest,
    { params }: SourceRouteParams,
  ): Promise<Response> {
    try {
      const workspace = await requireWorkspace(request);
      const { id: sourceId } = await params;
      const supabase = createServiceClient();

      return await handler(request, { workspace, sourceId, supabase });
    } catch (error) {
      return handleWorkspaceRouteError(error);
    }
  };
}
