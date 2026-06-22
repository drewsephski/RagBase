import { LimitError } from "@/lib/limits";
import { ValidationError } from "@/lib/ingestion/validate";
import { RateLimitError } from "@/lib/rate-limit/enforce";
import { WorkspaceAuthError } from "@/lib/workspace/auth";

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export function handleRouteError(error: unknown): Response {
  if (error instanceof WorkspaceAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof LimitError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ValidationError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof RateLimitError) {
    return Response.json(
      { error: error.message, code: "rate_limit" },
      {
        status: error.status,
        headers: {
          "Retry-After": String(error.retryAfterSeconds),
        },
      },
    );
  }
  console.error("Route error:", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
