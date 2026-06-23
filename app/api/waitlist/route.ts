import { NextRequest } from "next/server";
import { captureServerAnalyticsEvent } from "@/lib/analytics/server";
import { handleRouteError, jsonError } from "@/lib/api/errors";
import { enforceWaitlistRateLimit } from "@/lib/rate-limit/enforce";
import { createServiceClient } from "@/lib/supabase/server";
import { getWorkspaceHeaders, requireWorkspace } from "@/lib/workspace/auth";
import {
  isWaitlistHoneypotTriggered,
  isWaitlistSubmitTooFast,
  normalizeWaitlistEmail,
  waitlistBodySchema,
} from "@/lib/waitlist";

async function getOptionalWorkspaceId(request: NextRequest): Promise<string | null> {
  const { workspaceId, workspaceSecret } = getWorkspaceHeaders(request);

  if (!workspaceId || !workspaceSecret) {
    return null;
  }

  try {
    const workspace = await requireWorkspace(request);
    return workspace.id;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await enforceWaitlistRateLimit(request);

    const body: unknown = await request.json();
    const parsed = waitlistBodySchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message ?? "Invalid request.";
      return jsonError(firstIssue, 400);
    }

    const { email, feature, source, website, formOpenedAt } = parsed.data;

    if (isWaitlistHoneypotTriggered(website)) {
      return Response.json({ success: true });
    }

    if (isWaitlistSubmitTooFast(formOpenedAt)) {
      return jsonError("Please try again.", 400);
    }

    const normalizedEmail = normalizeWaitlistEmail(email);
    const workspaceId = await getOptionalWorkspaceId(request);
    const waitlistSource = source?.trim() || "paywall_dialog";

    const supabase = createServiceClient();
    const { error } = await supabase.from("waitlist_emails").insert({
      email: normalizedEmail,
      feature,
      workspace_id: workspaceId,
      source: waitlistSource,
    });

    if (error && error.code !== "23505") {
      console.error("Waitlist insert failed:", error);
      return jsonError("Could not join the waitlist. Please try again.", 500);
    }

    await captureServerAnalyticsEvent({
      event: "paywall_waitlist_submitted",
      properties: {
        feature,
        source: waitlistSource,
        has_workspace: Boolean(workspaceId),
      },
      timestamp: Date.now(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
