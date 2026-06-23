"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "ai/react";
import { apiJson } from "@/lib/api/client";
import type { Message as StoredMessage } from "@/lib/domain/definitions";
import { storedMessageToUiMessage } from "@/lib/chat/messages";
import type { WorkspaceHeaders } from "@/lib/api/types";

interface MessagesResponse {
  messages: StoredMessage[];
}

interface UseChatHistoryOptions {
  workspaceHeaders: WorkspaceHeaders | null;
  workspaceId: string | null;
  enabled: boolean;
  setMessages: (messages: Message[]) => void;
}

interface UseChatHistoryState {
  isHistoryReady: boolean;
}

export function useChatHistory({
  workspaceHeaders,
  workspaceId,
  enabled,
  setMessages,
}: UseChatHistoryOptions): UseChatHistoryState {
  const [isHistoryReady, setIsHistoryReady] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!enabled || !workspaceHeaders || !workspaceId) {
      requestRef.current += 1;
      setMessages([]);
      setIsHistoryReady(true);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setMessages([]);
    setIsHistoryReady(false);

    async function loadHistory() {
      try {
        const data = await apiJson<MessagesResponse>("/api/messages", {
          workspaceHeaders,
        });

        if (requestRef.current !== requestId) {
          return;
        }

        setMessages(data.messages.map(storedMessageToUiMessage));
      } catch {
        if (requestRef.current !== requestId) {
          return;
        }

        setMessages([]);
      } finally {
        if (requestRef.current === requestId) {
          setIsHistoryReady(true);
        }
      }
    }

    void loadHistory();
  }, [enabled, setMessages, workspaceHeaders, workspaceId]);

  return { isHistoryReady };
}
