import { NextRequest } from "next/server";
import { streamText } from "ai";
import { z } from "zod";
import {
  authErrorResponse,
  requireWorkspace,
} from "@/lib/workspace/auth";
import {
  checkMessageLimit,
  incrementMessageCount,
} from "@/lib/limits";
import { parseCitationsFromResponse } from "@/lib/chat/citations";
import { buildSystemPrompt } from "@/lib/chat/prompts";
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
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { enforceFreeChatRateLimit } from "@/lib/rate-limit/enforce";

const chatBodySchema = z.object({
  message: z.string().min(1).max(4000),
  sourceId: z.string().uuid().optional(),
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

    const { message, sourceId, model, openRouterKey } = parsed.data;
    const hasUserKey = Boolean(openRouterKey?.trim());
    const apiKey = openRouterKey?.trim() || getServerApiKey();

    if (!hasUserKey) {
      enforceFreeChatRateLimit(request, workspace.id);
    }

    await checkMessageLimit(workspace.id, hasUserKey);

    const chunks = await retrieveForChat({
      query: message,
      workspaceId: workspace.id,
      sourceId: sourceId ?? null,
      apiKey,
    });

    const contextBlocks = buildContextBlocks(chunks);
    const context = buildContextWindow(chunks);
    const systemPrompt = buildSystemPrompt(context);
    const supabase = createServiceClient();

    await supabase.from("messages").insert({
      workspace_id: workspace.id,
      role: "user",
      content: message,
      source_scope: sourceId ?? null,
    });

    const result = streamText({
      model: createChatModel(apiKey, model),
      system: systemPrompt,
      prompt: message,
      maxTokens: RETRIEVAL.MAX_OUTPUT_TOKENS,
      onFinish: async ({ text }) => {
        const parsedResponse = parseCitationsFromResponse(text, contextBlocks);

        await supabase.from("messages").insert({
          workspace_id: workspace.id,
          role: "assistant",
          content: parsedResponse.content,
          citations: parsedResponse.citations,
          model: model ?? null,
          source_scope: sourceId ?? null,
        });
        await incrementMessageCount(workspace.id);
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    if (error instanceof Error && error.name === "WorkspaceAuthError") {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
