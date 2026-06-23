import type { Citation, Message } from "@/lib/domain/definitions";
import { formatCitationFootnote } from "@/lib/chat/citations";

export type ChatExportFormat = "markdown" | "json";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

function formatRole(role: Message["role"]): string {
  return role === "user" ? "You" : "Assistant";
}

function appendCitationsMarkdown(citations: Citation[] | null): string {
  if (!citations || citations.length === 0) {
    return "";
  }

  const footnotes = citations
    .map((citation, index) => formatCitationFootnote(citation, index))
    .join("\n");

  return `\n\n**Citations**\n${footnotes}`;
}

function sortMessagesByCreatedAt(messages: Message[]): Message[] {
  return [...messages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function exportChatAsMarkdown(messages: Message[]): string {
  const sorted = sortMessagesByCreatedAt(messages);

  const lines = ["# Chat Export", ""];

  for (const message of sorted) {
    lines.push(
      `## ${formatRole(message.role)} — ${formatTimestamp(message.created_at)}`,
      "",
      message.content.trim(),
    );

    if (message.role === "assistant") {
      lines.push(appendCitationsMarkdown(message.citations));
    }

    if (message.model) {
      lines.push("", `_Model: ${message.model}_`);
    }

    lines.push("");
  }

  return lines.join("\n").trim();
}

function exportChatAsJson(messages: Message[]): string {
  const sorted = sortMessagesByCreatedAt(messages);

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      messageCount: sorted.length,
      messages: sorted,
    },
    null,
    2,
  );
}

export function exportChat(
  messages: Message[],
  format: ChatExportFormat,
): string {
  if (format === "json") {
    return exportChatAsJson(messages);
  }

  return exportChatAsMarkdown(messages);
}

export function getChatExportFilename(format: ChatExportFormat): string {
  const date = new Date().toISOString().slice(0, 10);
  const extension = format === "json" ? "json" : "md";
  return `ragbase-chat-${date}.${extension}`;
}

export function getChatExportMimeType(format: ChatExportFormat): string {
  return format === "json" ? "application/json" : "text/markdown";
}
