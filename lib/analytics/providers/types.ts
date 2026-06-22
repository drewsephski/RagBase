import type { AnalyticsPayload } from "@/lib/analytics/types";

export interface AnalyticsProvider {
  readonly name: string;
  capture(payload: AnalyticsPayload): Promise<void>;
}
