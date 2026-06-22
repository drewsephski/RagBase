import { NextRequest } from "next/server";
import { z } from "zod";
import { captureServerAnalyticsEvent } from "@/lib/analytics/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/types";

const analyticsBodySchema = z.object({
  event: z.enum(ANALYTICS_EVENTS),
  properties: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  timestamp: z.number().optional(),
  anonymousId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: unknown = await request.json();
    const parsed = analyticsBodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ ok: false }, { status: 400 });
    }

    await captureServerAnalyticsEvent({
      event: parsed.data.event,
      properties: parsed.data.properties,
      timestamp: parsed.data.timestamp ?? Date.now(),
      anonymousId: parsed.data.anonymousId,
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}
