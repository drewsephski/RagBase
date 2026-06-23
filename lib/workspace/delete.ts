import { createServiceClient } from "@/lib/supabase/server";
import {
  type WorkspaceDeleteOptions,
  prepareWorkspaceDeletion,
} from "@/lib/workspace/delete-policy";
import {
  fetchInactiveWorkspaceRows,
  isWorkspaceRetentionExempt,
  loadActiveRecoveryWorkspaceIds,
} from "@/lib/workspace/retention";

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

async function deleteWorkspaceStorage(
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

export async function deleteWorkspace(
  workspaceId: string,
  options: WorkspaceDeleteOptions = {},
): Promise<void> {
  const supabase = createServiceClient();

  await prepareWorkspaceDeletion(supabase, workspaceId, options);
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
): Promise<{ deletedCount: number; deletedIds: string[]; skippedCount: number }> {
  const supabase = createServiceClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffIso = cutoff.toISOString();

  const inactiveRows = await fetchInactiveWorkspaceRows(supabase, cutoffIso);
  const activeRecoveryIds = await loadActiveRecoveryWorkspaceIds(
    supabase,
    inactiveRows.map((row) => row.id),
  );

  const deletedIds: string[] = [];
  let skippedCount = 0;

  for (const row of inactiveRows) {
    const hasActiveRecoveryToken = activeRecoveryIds.has(row.id);

    if (isWorkspaceRetentionExempt(row, hasActiveRecoveryToken)) {
      skippedCount += 1;
      continue;
    }

    await deleteWorkspace(row.id);
    deletedIds.push(row.id);
  }

  return { deletedCount: deletedIds.length, deletedIds, skippedCount };
}
