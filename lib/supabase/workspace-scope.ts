import type { SupabaseClient } from "@supabase/supabase-js";
import { jsonError } from "@/lib/api/errors";

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

export async function fetchSourceInWorkspace<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  workspaceId: string,
  sourceId: string,
  columns: string,
  fetchErrorMessage: string,
): Promise<{ source: T } | { response: Response }> {
  const { data: source, error } = await getSourceInWorkspace(
    supabase,
    workspaceId,
    sourceId,
    columns,
  );

  if (error) {
    return { response: jsonError(fetchErrorMessage, 500) };
  }

  if (!source) {
    return { response: jsonError("Source not found", 404) };
  }

  return { source: source as unknown as T };
}
