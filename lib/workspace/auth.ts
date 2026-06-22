import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifySecret } from "@/lib/workspace/crypto";

export interface WorkspaceContext {
  id: string;
  plan: string;
  name: string | null;
  messageCount: number;
  messageCountDate: string | null;
}

export class WorkspaceAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "WorkspaceAuthError";
    this.status = status;
  }
}

export function getWorkspaceHeaders(request: NextRequest): {
  workspaceId: string | null;
  workspaceSecret: string | null;
} {
  return {
    workspaceId: request.headers.get("x-workspace-id"),
    workspaceSecret: request.headers.get("x-workspace-secret"),
  };
}

export async function requireWorkspace(
  request: NextRequest,
): Promise<WorkspaceContext> {
  const { workspaceId, workspaceSecret } = getWorkspaceHeaders(request);

  if (!workspaceId || !workspaceSecret) {
    throw new WorkspaceAuthError("Missing workspace credentials");
  }

  const supabase = createServiceClient();
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id, secret_hash, plan, name, message_count, message_count_date")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error || !workspace) {
    throw new WorkspaceAuthError("Workspace not found");
  }

  const valid = await verifySecret(workspaceSecret, workspace.secret_hash);
  if (!valid) {
    throw new WorkspaceAuthError("Invalid workspace secret");
  }

  await supabase
    .from("workspaces")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", workspaceId);

  return {
    id: workspace.id,
    plan: workspace.plan,
    name: workspace.name ?? null,
    messageCount: workspace.message_count,
    messageCountDate: workspace.message_count_date,
  };
}

export function authErrorResponse(error: unknown): Response {
  if (error instanceof WorkspaceAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("Unexpected auth error:", error);
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
