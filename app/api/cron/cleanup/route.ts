import { NextRequest } from "next/server";
import { LIMITS } from "@/app/lib/definitions";
import { deleteInactiveWorkspaces } from "@/lib/workspace/delete";
import { jsonError } from "@/lib/api/errors";

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const header = request.headers.get("authorization");
  if (!header) {
    return false;
  }
  const token = header.replace(/^Bearer\s+/i, "");
  return token === secret;
}

async function runCleanup(): Promise<Response> {
  const result = await deleteInactiveWorkspaces(LIMITS.RETENTION_DAYS);
  return Response.json({
    success: true,
    retentionDays: LIMITS.RETENTION_DAYS,
    ...result,
  });
}

export async function GET(request: NextRequest): Promise<Response> {
  if (!verifyCronSecret(request)) {
    return jsonError("Unauthorized", 401);
  }

  try {
    return await runCleanup();
  } catch (error) {
    console.error("Cron cleanup failed:", error);
    return jsonError("Cleanup failed", 500);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  if (!verifyCronSecret(request)) {
    return jsonError("Unauthorized", 401);
  }

  try {
    return await runCleanup();
  } catch (error) {
    console.error("Cron cleanup failed:", error);
    return jsonError("Cleanup failed", 500);
  }
}
