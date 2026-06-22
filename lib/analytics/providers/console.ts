import type { AnalyticsProvider } from "@/lib/analytics/providers/types";
import type { AnalyticsPayload } from "@/lib/analytics/types";

export function createConsoleAnalyticsProvider(): AnalyticsProvider {
  return {
    name: "console",
    async capture(payload: AnalyticsPayload): Promise<void> {
      console.info("[analytics]", {
        event: payload.event,
        properties: payload.properties,
        anonymousId: payload.anonymousId,
        timestamp: payload.timestamp,
      });
    },
  };
}
