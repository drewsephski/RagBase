import { NextRequest } from "next/server";
import { LIMITS } from "@/lib/domain/definitions";
import { deleteInactiveWorkspaces } from "@/lib/workspace/delete";
import { handleCronRoute } from "@/lib/api/cron-route";

async function runCleanup(): Promise<Response> {
  const result = await deleteInactiveWorkspaces(LIMITS.RETENTION_DAYS);
  return Response.json({
    success: true,
    retentionDays: LIMITS.RETENTION_DAYS,
    ...result,
  });
}

export async function GET(request: NextRequest): Promise<Response> {
  return handleCronRoute(request, runCleanup, "Cleanup failed");
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCronRoute(request, runCleanup, "Cleanup failed");
}
