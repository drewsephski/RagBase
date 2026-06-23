import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/api/cron-auth";
import { jsonError } from "@/lib/api/errors";

function requireCronSecret(request: NextRequest): Response | null {
  if (!verifyCronSecret(request)) {
    return jsonError("Unauthorized", 401);
  }

  return null;
}

export async function handleCronRoute(
  request: NextRequest,
  handler: () => Promise<Response>,
  errorMessage: string,
): Promise<Response> {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    return await handler();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    return jsonError(errorMessage, 500);
  }
}
