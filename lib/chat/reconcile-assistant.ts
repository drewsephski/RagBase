import type { Message as UiMessage } from "ai/react";
import { apiJson } from "@/lib/api/client";
import { getDisplayContent } from "@/lib/chat/citations";
import { storedMessageToUiMessage } from "@/lib/chat/messages";
import type { Message as StoredMessage } from "@/lib/domain/definitions";
import type { WorkspaceHeaders } from "@/lib/api/types";

interface MessagesResponse {
  messages: StoredMessage[];
}

function getLatestAssistantMessage(
  messages: StoredMessage[],
): StoredMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "assistant") {
      return message;
    }
  }

  return null;
}

function replaceLatestAssistantMessage(
  messages: UiMessage[],
  storedMessage: StoredMessage,
): UiMessage[] {
  const nextMessages = [...messages];

  for (let index = nextMessages.length - 1; index >= 0; index -= 1) {
    if (nextMessages[index]?.role === "assistant") {
      nextMessages[index] = storedMessageToUiMessage(storedMessage);
      return nextMessages;
    }
  }

  nextMessages.push(storedMessageToUiMessage(storedMessage));
  return nextMessages;
}

function shouldReplaceAssistantMessage(
  currentMessage: UiMessage | undefined,
  storedMessage: StoredMessage,
): boolean {
  if (!currentMessage) {
    return true;
  }

  const storedUiMessage = storedMessageToUiMessage(storedMessage);

  if (storedUiMessage.content !== currentMessage.content) {
    return true;
  }

  if (getDisplayContent(currentMessage.content) !== storedMessage.content) {
    return true;
  }

  return Boolean(storedMessage.citations?.length);
}

export async function reconcileLatestAssistantMessage(
  workspaceHeaders: WorkspaceHeaders,
  currentMessages: UiMessage[],
): Promise<UiMessage[] | null> {
  const delaysMs = [200, 400, 800, 1200, 1800];
  const currentAssistant = [...currentMessages]
    .reverse()
    .find((message) => message.role === "assistant");

  for (const delayMs of delaysMs) {
    await new Promise((resolve) => {
      window.setTimeout(resolve, delayMs);
    });

    const data = await apiJson<MessagesResponse>("/api/messages", {
      workspaceHeaders,
    });
    const latestAssistant = getLatestAssistantMessage(data.messages);

    if (!latestAssistant) {
      continue;
    }

    if (
      shouldReplaceAssistantMessage(currentAssistant, latestAssistant) ||
      delayMs === delaysMs.at(-1)
    ) {
      return replaceLatestAssistantMessage(currentMessages, latestAssistant);
    }
  }

  return null;
}
