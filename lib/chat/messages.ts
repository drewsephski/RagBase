import type { Message as UiMessage } from "ai/react";
import type { CoreMessage } from "ai";
import type { Citation, Message } from "@/lib/domain/definitions";
import { getDisplayContent } from "@/lib/chat/citations";
import { createServiceClient } from "@/lib/supabase/server";

export interface UiMessageCitationData {
  citations: Citation[] | null;
}

export function getUiMessageCitations(message: UiMessage): Citation[] | null {
  if (!message.data || typeof message.data !== "object" || Array.isArray(message.data)) {
    const fromAnnotations = getCitationsFromAnnotations(message.annotations);
    if (fromAnnotations) {
      return fromAnnotations;
    }

    return null;
  }

  const citations = (message.data as unknown as UiMessageCitationData).citations;
  if (Array.isArray(citations)) {
    return citations;
  }

  return getCitationsFromAnnotations(message.annotations);
}

function getCitationsFromAnnotations(
  annotations: UiMessage["annotations"],
): Citation[] | null {
  if (!Array.isArray(annotations)) {
    return null;
  }

  for (const annotation of annotations) {
    if (
      typeof annotation !== "object" ||
      annotation === null ||
      !("citations" in annotation)
    ) {
      continue;
    }

    const citations = (annotation as { citations?: unknown }).citations;
    if (Array.isArray(citations)) {
      return citations as Citation[];
    }
  }

  return null;
}

/** Max prior turns sent to the model (user + assistant pairs). */
export const CHAT_HISTORY_MESSAGE_LIMIT = 20;

function appendCitationsBlock(
  content: string,
  citations: Citation[] | null,
): string {
  if (!citations?.length) {
    return content;
  }

  const block = citations.map((citation, index) => ({
    ref: index + 1,
    chunkId: citation.chunkId,
    snippet: citation.snippet,
  }));

  return `${content}\n\n<citations>\n${JSON.stringify(block)}\n</citations>`;
}

export function storedMessageToUiMessage(message: Message): UiMessage {
  const content =
    message.role === "assistant"
      ? appendCitationsBlock(message.content, message.citations)
      : message.content;

  return {
    id: message.id,
    role: message.role,
    content,
    createdAt: new Date(message.created_at),
    data:
      message.role === "assistant"
        ? ({ citations: message.citations ?? null } satisfies UiMessageCitationData)
        : undefined,
  };
}

export async function fetchWorkspaceMessages(
  workspaceId: string,
): Promise<Message[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return (data ?? []) as Message[];
}

export function messageContentForModel(message: Message): string {
  if (message.role === "assistant") {
    return getDisplayContent(message.content);
  }

  return message.content;
}

export function buildConversationMessages(
  messages: Message[],
): CoreMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: messageContentForModel(message),
  }));
}

export async function fetchRecentConversationMessages(
  workspaceId: string,
  limit = CHAT_HISTORY_MESSAGE_LIMIT,
): Promise<Message[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch recent messages: ${error.message}`);
  }

  return ((data ?? []) as Message[]).reverse();
}
