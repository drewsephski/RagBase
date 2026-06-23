import type { SupabaseClient } from "@supabase/supabase-js";
import { jsonError } from "@/lib/api/errors";

const UPLOADS_BUCKET = "uploads";

export async function rollbackPendingSourceInsert(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<Response> {
  await supabase.storage.from(UPLOADS_BUCKET).remove([storagePath]);
  return jsonError("Failed to create source record", 500);
}
