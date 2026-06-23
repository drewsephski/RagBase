import { trackLimitBoundary } from "@/lib/analytics/limit-boundary";
import { ApiError } from "@/lib/api/api-error";
import type { WorkspaceHeaders } from "@/lib/api/types";

export { ApiError } from "@/lib/api/api-error";

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

  const secret = workspaceHeaders["X-Workspace-Secret"];
  if (secret) {
    headers.set("X-Workspace-Secret", secret);
  }
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

export async function readApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) {
      return body.error;
    }
  } catch {
    // ignore parse errors
  }

  return fallback;
}

export async function apiJson<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const response = await apiFetch(path, options);

  if (!response.ok) {
    const message = await readApiErrorMessage(
      response,
      "Something went wrong. Please try again.",
    );

    const apiError = new ApiError(message, response.status);
    trackLimitBoundary(apiError);
    throw apiError;
  }

  return (await response.json()) as T;
}
