import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import {
  authErrorResponse,
  requireWorkspace,
} from "@/lib/workspace/auth";
import { checkSourceLimit } from "@/lib/limits";
import { runIngestionPipeline } from "@/lib/ingestion/pipeline";
import { validateUpload } from "@/lib/ingestion/validate";
import { enforceUploadRateLimit } from "@/lib/rate-limit/enforce";
import { createServiceClient } from "@/lib/supabase/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";

const UPLOADS_BUCKET = "uploads";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    await enforceUploadRateLimit(request, workspace.id);
    await checkSourceLimit(workspace.id);

    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return jsonError("Missing file upload", 400);
    }

    const mimeType = fileEntry.type || "application/octet-stream";
    validateUpload({
      filename: fileEntry.name,
      mimeType,
      bytes: fileEntry.size,
    });

    const sourceId = randomUUID();
    const storagePath = `${workspace.id}/${sourceId}/${fileEntry.name}`;
    const supabase = createServiceClient();
    const buffer = Buffer.from(await fileEntry.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(UPLOADS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload failed:", uploadError);
      return jsonError("Failed to upload file to storage", 500);
    }

    const { data: source, error: insertError } = await supabase
      .from("sources")
      .insert({
        id: sourceId,
        workspace_id: workspace.id,
        type: "file",
        name: fileEntry.name,
        status: "pending",
        storage_path: storagePath,
        metadata: {
          mimeType,
          size: fileEntry.size,
        },
      })
      .select("id, name, status, type, created_at")
      .single();

    if (insertError || !source) {
      await supabase.storage.from(UPLOADS_BUCKET).remove([storagePath]);
      return jsonError("Failed to create source record", 500);
    }

    try {
      await runIngestionPipeline(sourceId);
    } catch (pipelineError) {
      console.error("Ingestion pipeline failed:", pipelineError);
    }

    const { data: updatedSource } = await supabase
      .from("sources")
      .select("id, name, status, type, created_at, error_message")
      .eq("id", sourceId)
      .single();

    return Response.json({ source: updatedSource ?? source }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "WorkspaceAuthError") {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
