import { getAuthenticatedUser } from "@/lib/supabase/auth-server";
import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_WORKSPACE_NAME } from "@/lib/domain/definitions";

export interface AccountWorkspaceSummary {
  id: string;
  name: string;
  createdAt: string;
}

export async function listAccountWorkspaces(): Promise<AccountWorkspaceSummary[]> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return [];
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, created_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("Failed to list account workspaces:", error);
    return [];
  }

  return data.map((workspace) => ({
    id: workspace.id,
    name: workspace.name ?? DEFAULT_WORKSPACE_NAME,
    createdAt: workspace.created_at,
  }));
}

export async function linkWorkspaceToAccount(workspaceId: string): Promise<boolean> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return false;
  }

  const supabase = createServiceClient();
  const { data: workspace, error: fetchError } = await supabase
    .from("workspaces")
    .select("owner_user_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (fetchError || !workspace) {
    return false;
  }

  if (workspace.owner_user_id && workspace.owner_user_id !== user.id) {
    return false;
  }

  if (workspace.owner_user_id === user.id) {
    return true;
  }

  const { error: updateError } = await supabase
    .from("workspaces")
    .update({ owner_user_id: user.id })
    .eq("id", workspaceId)
    .is("owner_user_id", null);

  return !updateError;
}
