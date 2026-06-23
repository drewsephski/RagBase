import { NextRequest } from "next/server";
import type { Message } from "@/lib/domain/definitions";
import {
  authErrorResponse,
  requireWorkspace,
} from "@/lib/workspace/auth";
import {
  exportChat,
  getChatExportFilename,
  getChatExportMimeType,
  type ChatExportFormat,
} from "@/lib/export/chat";
import { createServiceClient } from "@/lib/supabase/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";

async function fetchWorkspaceMessages(
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

function parseExportFormat(value: string | null): ChatExportFormat | null {
  if (value === "markdown" || value === "json") {
    return value;
  }
  return null;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const workspace = await requireWorkspace(request);
    const format = parseExportFormat(
      request.nextUrl.searchParams.get("format"),
    );

    if (!format) {
      return jsonError('Invalid format. Use "markdown" or "json".', 400);
    }

    const messages = await fetchWorkspaceMessages(workspace.id);
    const body = exportChat(messages, format);

    return new Response(body, {
      headers: {
        "Content-Type": getChatExportMimeType(format),
        "Content-Disposition": `attachment; filename="${getChatExportFilename(format)}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "WorkspaceAuthError") {
      return authErrorResponse(error);
    }
    return handleRouteError(error);
  }
}
