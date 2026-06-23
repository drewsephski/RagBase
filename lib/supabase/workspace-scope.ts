import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Helpers for service-role Supabase queries. The service client bypasses RLS,
 * so every read/write must be scoped by workspace_id (or verified child
 * ownership) after `requireWorkspace()` validates headers.
 */

export async function getSourceInWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  sourceId: string,
  columns = "id",
) {
  return await supabase
    .from("sources")
    .select(columns)
    .eq("id", sourceId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
}

export class SourceNotInWorkspaceError extends Error {
  status = 404;

  constructor(sourceId: string) {
    super(`Source not found: ${sourceId}`);
    this.name = "SourceNotInWorkspaceError";
  }
}

export async function assertSourceInWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  sourceId: string,
): Promise<void> {
  const { data, error } = await getSourceInWorkspace(
    supabase,
    workspaceId,
    sourceId,
    "id",
  );

  if (error) {
    throw new Error(`Failed to verify source ownership: ${error.message}`);
  }

  if (!data) {
    throw new SourceNotInWorkspaceError(sourceId);
  }
}
