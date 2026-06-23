import type { Source } from "@/lib/domain/definitions";
import {
  runIngestionPipeline,
  type IngestionPipelineOptions,
} from "@/lib/ingestion/pipeline";
import { createServiceClient } from "@/lib/supabase/server";

const SOURCE_INGESTION_SNAPSHOT_SELECT =
  "id, name, status, type, created_at, error_message, metadata";

export interface IngestionAttemptResult {
  source: Source | null;
  success: boolean;
}

export async function fetchSourceIngestionSnapshot(
  sourceId: string,
): Promise<Source | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sources")
    .select(SOURCE_INGESTION_SNAPSHOT_SELECT)
    .eq("id", sourceId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch source after ingestion:", error);
    return null;
  }

  return data as Source | null;
}

/** Run the pipeline; expected failures update the source row and do not throw. */
export async function executeSourceIngestion(
  sourceId: string,
  options: IngestionPipelineOptions = {},
): Promise<IngestionAttemptResult> {
  try {
    await runIngestionPipeline(sourceId, options);
  } catch (error) {
    console.error("Ingestion pipeline failed:", error);
  }

  const source = await fetchSourceIngestionSnapshot(sourceId);

  return {
    source,
    success: source?.status === "ready",
  };
}
