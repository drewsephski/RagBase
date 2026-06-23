import { NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth-server";
import {
  authErrorResponse,
  requireWorkspace,
  WorkspaceAuthError,
} from "@/lib/workspace/auth";
import {
  generateWorkspaceSecret,
  hashSecret,
} from "@/lib/workspace/crypto";
import { handleRouteError } from "@/lib/api/errors";
import { enforceWorkspaceCreateRateLimit } from "@/lib/rate-limit/enforce";

const createWorkspaceBodySchema = z.object({
  name: z.string().trim().min(1).max(64).optional(),
});

const renameWorkspaceBodySchema = z.object({
  name: z.string().trim().min(1).max(64),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await enforceWorkspaceCreateRateLimit(request);

    let name: string | undefined;

    try {
      const body: unknown = await request.json();
      const parsed = createWorkspaceBodySchema.safeParse(body);
      if (parsed.success && parsed.data.name) {
        name = parsed.data.name;
      }
    } catch {
      // Empty body is valid for anonymous workspace creation.
    }

    const secret = generateWorkspaceSecret();
    const secretHash = await hashSecret(secret);
    const supabase = createServiceClient();
    const user = await getAuthenticatedUser();

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert({
        secret_hash: secretHash,
        plan: "anonymous",
        name: name ?? null,
        ...(user ? { owner_user_id: user.id } : {}),
      })
      .select("id")
      .single();

    if (error || !workspace) {
      console.error("Failed to create workspace:", error);
      return Response.json(
        { error: "Failed to create workspace" },
        { status: 500 },
      );
    }

    return Response.json({
      workspaceId: workspace.id,
      workspaceSecret: secret,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    const body: unknown = await request.json();
    const parsed = renameWorkspaceBodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Workspace name must be 1–64 characters." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("workspaces")
      .update({ name: parsed.data.name })
      .eq("id", workspace.id);

    if (error) {
      console.error("Failed to rename workspace:", error);
      return Response.json(
        { error: "Failed to rename workspace" },
        { status: 500 },
      );
    }

    return Response.json({ success: true, name: parsed.data.name });
  } catch (error) {
    if (error instanceof WorkspaceAuthError) {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
