import { describe, expect, test } from "@jest/globals";
import {
  buildConversationMessages,
  messageContentForModel,
  storedMessageToUiMessage,
} from "@/lib/chat/messages";
import type { Message } from "@/lib/domain/definitions";

describe("storedMessageToUiMessage", () => {
  test("reconstructs citations block for assistant messages", () => {
    const stored: Message = {
      id: "11111111-1111-4111-8111-111111111111",
      workspace_id: "22222222-2222-4222-8222-222222222222",
      role: "assistant",
      content: "The lease term is twelve months [1].",
      citations: [
        {
          chunkId: "33333333-3333-4333-8333-333333333333",
          sourceId: "44444444-4444-4444-8444-444444444444",
          sourceName: "lease.pdf",
          pageNumber: 2,
          snippet: "Term: twelve (12) months",
        },
      ],
      model: "google/gemini-2.5-flash",
      source_scope: null,
      created_at: "2026-06-23T12:00:00.000Z",
    };

    const uiMessage = storedMessageToUiMessage(stored);

    expect(uiMessage.content).toContain("The lease term is twelve months [1].");
    expect(uiMessage.content).toContain("<citations>");
    expect(uiMessage.content).toContain("33333333-3333-4333-8333-333333333333");
    expect(uiMessage.content).toContain("Term: twelve (12) months");
  });

  test("passes user messages through unchanged", () => {
    const stored: Message = {
      id: "11111111-1111-4111-8111-111111111111",
      workspace_id: "22222222-2222-4222-8222-222222222222",
      role: "user",
      content: "What is the lease term?",
      citations: null,
      model: null,
      source_scope: null,
      created_at: "2026-06-23T12:00:00.000Z",
    };

    const uiMessage = storedMessageToUiMessage(stored);

    expect(uiMessage.content).toBe("What is the lease term?");
    expect(uiMessage.role).toBe("user");
  });

  test("strips citations block for model history", () => {
    const stored: Message = {
      id: "11111111-1111-4111-8111-111111111111",
      workspace_id: "22222222-2222-4222-8222-222222222222",
      role: "assistant",
      content: "Answer text [1].\n\n<citations>\n[]\n</citations>",
      citations: null,
      model: null,
      source_scope: null,
      created_at: "2026-06-23T12:00:00.000Z",
    };

    expect(messageContentForModel(stored)).toBe("Answer text [1].");
  });

  test("buildConversationMessages maps roles for streamText", () => {
    const messages: Message[] = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        workspace_id: "22222222-2222-4222-8222-222222222222",
        role: "user",
        content: "First question?",
        citations: null,
        model: null,
        source_scope: null,
        created_at: "2026-06-23T12:00:00.000Z",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        workspace_id: "22222222-2222-4222-8222-222222222222",
        role: "assistant",
        content: "First answer.",
        citations: null,
        model: null,
        source_scope: null,
        created_at: "2026-06-23T12:00:01.000Z",
      },
    ];

    expect(buildConversationMessages(messages)).toEqual([
      { role: "user", content: "First question?" },
      { role: "assistant", content: "First answer." },
    ]);
  });
});
