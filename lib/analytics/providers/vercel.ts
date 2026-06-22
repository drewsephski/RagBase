import type { AnalyticsProvider } from "@/lib/analytics/providers/types";
import type { AnalyticsPayload } from "@/lib/analytics/types";

/**
 * Server-side adapter for Vercel Web Analytics custom events.
 * Set VERCEL_ANALYTICS_ENABLED=true when @vercel/analytics is configured client-side,
 * or when forwarding events to a Vercel Analytics ingest endpoint.
 */
export function createVercelAnalyticsProvider(): AnalyticsProvider | null {
  const enabled = process.env.VERCEL_ANALYTICS_ENABLED === "true";
  const ingestUrl = process.env.VERCEL_ANALYTICS_INGEST_URL?.trim();

  if (!enabled && !ingestUrl) {
    return null;
  }

  return {
    name: "vercel",
    async capture(payload: AnalyticsPayload): Promise<void> {
      if (!ingestUrl) {
        return;
      }

      await fetch(ingestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          o: payload.event,
          ts: payload.timestamp,
          ed: payload.properties ?? {},
        }),
      });
    },
  };
}
