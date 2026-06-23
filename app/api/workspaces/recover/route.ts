import { NextRequest } from "next/server";
import { z } from "zod";
import { captureServerAnalyticsEvent } from "@/lib/analytics/server";
import { handleRouteError } from "@/lib/api/errors";
import { getSupportEmail } from "@/lib/support";
import {
  exchangeRecoveryToken,
  RecoveryTokenError,
} from "@/lib/workspace/recovery";
import { enforceRecoveryExchangeRateLimit } from "@/lib/rate-limit/enforce";
import { createServiceClient } from "@/lib/supabase/server";

const recoverBodySchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await enforceRecoveryExchangeRateLimit(request);

    const body: unknown = await request.json();
    const parsed = recoverBodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Recovery token is required." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const result = await exchangeRecoveryToken(supabase, parsed.data.token);

    await captureServerAnalyticsEvent({
      event: "recovery_link_used",
      properties: { recovery_success: true },
      timestamp: Date.now(),
    });

    return Response.json({
      workspaceId: result.workspaceId,
      workspaceSecret: result.workspaceSecret,
    });
  } catch (error) {
    if (error instanceof RecoveryTokenError) {
      return Response.json(
        {
          error: error.message,
          supportEmail: getSupportEmail(),
        },
        { status: error.status },
      );
    }
    return handleRouteError(error);
  }
}
