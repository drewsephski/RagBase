import type { Citation, Message } from "@/lib/domain/definitions";
import { formatCitationFootnote } from "@/lib/chat/citations";
import { createServiceClient } from "@/lib/supabase/server";

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

export function exportChatAsMarkdown(messages: Message[]): string {
  const sorted = [...messages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

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

export function exportChatAsJson(messages: Message[]): string {
  const sorted = [...messages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

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

export const messagesToMarkdown = exportChatAsMarkdown;
export const messagesToJson = exportChatAsJson;
