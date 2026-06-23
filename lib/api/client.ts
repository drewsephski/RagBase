import { trackLimitBoundary } from "@/lib/analytics/limit-boundary";
import { ApiError } from "@/lib/api/api-error";
import type { WorkspaceHeaders } from "@/lib/api/types";
import { markWorkspaceAccountLinkedLocal } from "@/lib/workspace/registry";

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

async function readErrorBody(
  response: Response,
): Promise<{ message: string | null; code: string | null }> {
  try {
    const body = (await response.json()) as { error?: string; code?: string };
    return {
      message: body.error ?? null,
      code: body.code ?? null,
    };
  } catch {
    return { message: null, code: null };
  }
}

async function readErrorMessage(response: Response): Promise<string | null> {
  const { message } = await readErrorBody(response);
  return message;
}

async function executeFetch(
  path: string,
  options: ApiFetchOptions,
): Promise<Response> {
  const { workspaceHeaders, headers: initHeaders, ...init } = options;
  const headers = new Headers(initHeaders);

  applyWorkspaceHeaders(headers, workspaceHeaders);

  return fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });
}

export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { workspaceHeaders } = options;
  const response = await executeFetch(path, options);

  if (
    response.status === 401 &&
    workspaceHeaders?.["X-Workspace-Secret"] &&
    workspaceHeaders["X-Workspace-Id"]
  ) {
    const errorMessage = await readErrorMessage(response.clone());
    if (errorMessage === "Invalid workspace secret") {
      try {
        markWorkspaceAccountLinkedLocal(workspaceHeaders["X-Workspace-Id"]);
      } catch {
        // Registry may not include this workspace; still retry with session auth.
      }

      return executeFetch(path, {
        ...options,
        workspaceHeaders: {
          "X-Workspace-Id": workspaceHeaders["X-Workspace-Id"],
        },
      });
    }
  }

  return response;
}

export async function readApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const message = await readErrorMessage(response);
  return message ?? fallback;
}

export async function apiJson<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const response = await apiFetch(path, options);

  if (!response.ok) {
    const { message, code } = await readErrorBody(response);
    const apiError = new ApiError(
      message ?? "Something went wrong. Please try again.",
      response.status,
      code ?? undefined,
    );
    trackLimitBoundary(apiError);
    throw apiError;
  }

  return (await response.json()) as T;
}
