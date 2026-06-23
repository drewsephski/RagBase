import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireWorkspace,
} from "@/lib/workspace/auth";
import {
  generateStarterQuestions,
  parseStarterTemplateId,
  STARTER_QUESTIONS_PER_SOURCE,
} from "@/lib/chat/starters";
import { createServiceClient } from "@/lib/supabase/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import type { StarterQuestion } from "@/lib/domain/definitions";
import type { TemplateId } from "@/lib/domain/templates";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getCachedStarters(
  metadata: Record<string, unknown> | null,
  templateId?: TemplateId,
): StarterQuestion[] | null {
  if (templateId) {
    const byTemplate = metadata?.starter_questions_by_template;
    if (
      byTemplate &&
      typeof byTemplate === "object" &&
      !Array.isArray(byTemplate)
    ) {
      const cached = (byTemplate as Record<string, unknown>)[templateId];
      if (Array.isArray(cached) && cached.length > 0) {
        return cached as StarterQuestion[];
      }
    }

    return null;
  }

  const cached = metadata?.starter_questions;
  if (!Array.isArray(cached) || cached.length === 0) {
    return null;
  }
  return cached as StarterQuestion[];
}

function buildStarterMetadataUpdate(
  metadata: Record<string, unknown> | null,
  starters: StarterQuestion[],
  templateId?: TemplateId,
): Record<string, unknown> {
  if (templateId) {
    const existingByTemplate =
      metadata?.starter_questions_by_template &&
      typeof metadata.starter_questions_by_template === "object" &&
      !Array.isArray(metadata.starter_questions_by_template)
        ? (metadata.starter_questions_by_template as Record<
            string,
            StarterQuestion[]
          >)
        : {};

    return {
      ...(metadata ?? {}),
      starter_questions_by_template: {
        ...existingByTemplate,
        [templateId]: starters,
      },
    };
  }

  return {
    ...(metadata ?? {}),
    starter_questions: starters,
  };
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
    const templateId = parseStarterTemplateId(
      request.nextUrl.searchParams.get("template"),
    );
    const cached = getCachedStarters(metadata, templateId);
    if (cached) {
      return Response.json({
        starters: cached.slice(0, STARTER_QUESTIONS_PER_SOURCE),
      });
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
      templateId,
    });

    await supabase
      .from("sources")
      .update({
        metadata: buildStarterMetadataUpdate(metadata, starters, templateId),
      })
      .eq("id", id)
      .eq("workspace_id", workspace.id);

    return Response.json({ starters });
  } catch (error) {
    if (error instanceof Error && error.name === "WorkspaceAuthError") {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
