import { createServiceClient } from "@/lib/supabase/server";

async function collectStoragePaths(
  prefix: string,
): Promise<string[]> {
  const supabase = createServiceClient();
  const { data: entries, error } = await supabase.storage
    .from("uploads")
    .list(prefix, { limit: 1000 });

  if (error || !entries?.length) {
    return [];
  }

  const paths: string[] = [];

  for (const entry of entries) {
    const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.id === null) {
      const nested = await collectStoragePaths(entryPath);
      paths.push(...nested);
      continue;
    }

    paths.push(entryPath);
  }

  return paths;
}

export async function deleteWorkspaceStorage(
  workspaceId: string,
): Promise<void> {
  const paths = await collectStoragePaths(workspaceId);

  if (paths.length === 0) {
    return;
  }

  const supabase = createServiceClient();
  const { error: removeError } = await supabase.storage
    .from("uploads")
    .remove(paths);

  if (removeError) {
    console.error("Failed to remove storage files:", removeError);
  }
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const supabase = createServiceClient();

  await deleteWorkspaceStorage(workspaceId);

  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);

  if (error) {
    throw new Error(`Failed to delete workspace: ${error.message}`);
  }
}

export async function deleteInactiveWorkspaces(
  retentionDays: number,
): Promise<{ deletedCount: number; deletedIds: string[] }> {
  const supabase = createServiceClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffIso = cutoff.toISOString();

  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("id")
    .lt("last_seen_at", cutoffIso);

  if (error) {
    throw new Error(`Failed to query inactive workspaces: ${error.message}`);
  }

  const deletedIds: string[] = [];

  for (const workspace of workspaces ?? []) {
    await deleteWorkspace(workspace.id);
    deletedIds.push(workspace.id);
  }

  return { deletedCount: deletedIds.length, deletedIds };
}
