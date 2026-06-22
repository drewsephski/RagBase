import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireWorkspace,
} from "@/lib/workspace/auth";
import { generateStarterQuestions } from "@/lib/chat/starters";
import { createServiceClient } from "@/lib/supabase/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import type { StarterQuestion } from "@/app/lib/definitions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getCachedStarters(
  metadata: Record<string, unknown> | null,
): StarterQuestion[] | null {
  const cached = metadata?.starter_questions;
  if (!Array.isArray(cached) || cached.length === 0) {
    return null;
  }
  return cached as StarterQuestion[];
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: source, error } = await supabase
      .from("sources")
      .select("id, name, status, metadata")
      .eq("id", id)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (error) {
      return jsonError("Failed to fetch source", 500);
    }

    if (!source) {
      return jsonError("Source not found", 404);
    }

    if (source.status !== "ready") {
      return jsonError("Source is not ready yet", 409);
    }

    const metadata = source.metadata as Record<string, unknown> | null;
    const cached = getCachedStarters(metadata);
    if (cached) {
      return Response.json({ starters: cached });
    }

    const { data: documents } = await supabase
      .from("documents")
      .select("id")
      .eq("source_id", id);

    const documentIds = (documents ?? []).map((doc) => doc.id);
    let chunkTexts: string[] = [];

    if (documentIds.length > 0) {
      const { data: chunks } = await supabase
        .from("chunks")
        .select("chunk_text")
        .in("document_id", documentIds)
        .limit(8);

      chunkTexts = (chunks ?? []).map((chunk) => chunk.chunk_text);
    }

    const starters = await generateStarterQuestions({
      sourceName: source.name,
      chunkTexts,
    });

    await supabase
      .from("sources")
      .update({
        metadata: {
          ...(metadata ?? {}),
          starter_questions: starters,
        },
      })
      .eq("id", id);

    return Response.json({ starters });
  } catch (error) {
    if (error instanceof Error && error.name === "WorkspaceAuthError") {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
