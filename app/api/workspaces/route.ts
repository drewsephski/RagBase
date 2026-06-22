import { createServiceClient } from "@/lib/supabase/server";
import {
  generateWorkspaceSecret,
  hashSecret,
} from "@/lib/workspace/crypto";
import { handleRouteError } from "@/lib/api/errors";

export async function POST(): Promise<Response> {
  try {
    const secret = generateWorkspaceSecret();
    const secretHash = await hashSecret(secret);
    const supabase = createServiceClient();

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert({
        secret_hash: secretHash,
        plan: "anonymous",
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
