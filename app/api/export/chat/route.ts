import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireWorkspace,
} from "@/lib/workspace/auth";
import { fetchWorkspaceMessages } from "@/lib/chat/messages";
import {
  exportChat,
  getChatExportFilename,
  getChatExportMimeType,
  type ChatExportFormat,
} from "@/lib/export/chat";
import { handleRouteError, jsonError } from "@/lib/api/errors";

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
