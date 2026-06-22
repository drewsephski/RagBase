import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { trackLimitBoundary } from "@/lib/analytics/limit-boundary";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface ApiFetchOptions extends RequestInit {
  workspaceHeaders?: WorkspaceHeaders | null;
}

function applyWorkspaceHeaders(
  headers: Headers,
  workspaceHeaders?: WorkspaceHeaders | null,
): void {
  if (!workspaceHeaders) {
    return;
  }

  headers.set("X-Workspace-Id", workspaceHeaders["X-Workspace-Id"]);
  headers.set("X-Workspace-Secret", workspaceHeaders["X-Workspace-Secret"]);
}

export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { workspaceHeaders, headers: initHeaders, ...init } = options;
  const headers = new Headers(initHeaders);

  applyWorkspaceHeaders(headers, workspaceHeaders);

  return fetch(path, {
    ...init,
    headers,
  });
}

export async function apiJson<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const response = await apiFetch(path, options);

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";

    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // ignore parse errors
    }

    const apiError = new ApiError(message, response.status);
    trackLimitBoundary(apiError);
    throw apiError;
  }

  return (await response.json()) as T;
}
