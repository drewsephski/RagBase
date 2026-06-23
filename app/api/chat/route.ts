import { NextRequest } from "next/server";
import { createDataStreamResponse, streamText } from "ai";
import { z } from "zod";
import {
  authErrorResponse,
  requireWorkspace,
} from "@/lib/workspace/auth";
import {
  checkMessageLimit,
  incrementMessageCount,
} from "@/lib/limits";
import { resolveStorageCitations } from "@/lib/chat/resolve-storage-citations";
import { buildSystemPrompt } from "@/lib/chat/prompts";
import {
  buildConversationMessages,
  fetchRecentConversationMessages,
} from "@/lib/chat/messages";
import { RETRIEVAL } from "@/lib/retrieval/config";
import {
  buildContextBlocks,
  buildContextWindow,
} from "@/lib/retrieval/context";
import { retrieveForChat } from "@/lib/retrieval/retrieve";
import {
  createChatModel,
  getServerApiKey,
} from "@/lib/openrouter/client";
import { createServiceClient } from "@/lib/supabase/server";
import { getSourceInWorkspace } from "@/lib/supabase/workspace-scope";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { enforceFreeChatRateLimit } from "@/lib/rate-limit/enforce";

const chatBodySchema = z.object({
  message: z.string().min(1).max(4000),
  sourceId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  model: z.string().optional(),
  openRouterKey: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);

    const body: unknown = await request.json();
    const parsed = chatBodySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid request body", 400);
    }

    const { message, sourceId, documentId, model, openRouterKey } = parsed.data;
    const hasUserKey = Boolean(openRouterKey?.trim());
    const apiKey = openRouterKey?.trim() || getServerApiKey();

    if (!hasUserKey) {
      await enforceFreeChatRateLimit(request, workspace.id);
    }

    await checkMessageLimit(workspace.id, hasUserKey);

    const supabase = createServiceClient();
    const priorMessages = await fetchRecentConversationMessages(workspace.id);
    const conversationHistory = buildConversationMessages(priorMessages);

    if (sourceId) {
      const { data: scopedSource, error: sourceScopeError } =
        await getSourceInWorkspace(supabase, workspace.id, sourceId, "id");

      if (sourceScopeError) {
        return jsonError("Failed to verify source", 500);
      }

      if (!scopedSource) {
        return jsonError("Source not found", 404);
      }
    }

    if (documentId) {
      const { data: document, error: documentError } = await supabase
        .from("documents")
        .select("id, source_id")
        .eq("id", documentId)
        .maybeSingle();

      if (documentError) {
        return jsonError("Failed to verify document scope", 500);
      }

      if (!document) {
        return jsonError("Document not found", 404);
      }

      const { data: documentSource, error: documentSourceError } =
        await getSourceInWorkspace(
          supabase,
          workspace.id,
          document.source_id,
          "id",
        );

      if (documentSourceError) {
        return jsonError("Failed to verify document scope", 500);
      }

      if (!documentSource) {
        return jsonError("Document not found", 404);
      }

      if (sourceId && document.source_id !== sourceId) {
        return jsonError("Document does not belong to the scoped source", 400);
      }
    }

    const chunks = await retrieveForChat({
      query: message,
      workspaceId: workspace.id,
      sourceId: sourceId ?? null,
      documentId: documentId ?? null,
      apiKey,
    });

    const contextBlocks = buildContextBlocks(chunks);
    const context = buildContextWindow(chunks);
    const systemPrompt = buildSystemPrompt(context);

    await supabase.from("messages").insert({
      workspace_id: workspace.id,
      role: "user",
      content: message,
      source_scope: sourceId ?? null,
    });

    const result = streamText({
      model: createChatModel(apiKey, model),
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: "user", content: message },
      ],
      maxTokens: RETRIEVAL.MAX_OUTPUT_TOKENS,
    });

    return createDataStreamResponse({
      execute: async (dataStream) => {
        result.mergeIntoDataStream(dataStream, {
          experimental_sendFinish: false,
        });

        const text = await result.text;
        const parsedResponse = await resolveStorageCitations(
          supabase,
          workspace.id,
          text,
          contextBlocks,
        );

        await supabase.from("messages").insert({
          workspace_id: workspace.id,
          role: "assistant",
          content: parsedResponse.content,
          citations: parsedResponse.citations,
          model: model ?? null,
          source_scope: sourceId ?? null,
        });
        await incrementMessageCount(workspace.id);

        if (parsedResponse.citations.length > 0) {
          dataStream.writeMessageAnnotation({
            citations: parsedResponse.citations,
          });
        }
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "WorkspaceAuthError") {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
