import { trackEvent } from "@/lib/analytics/track";
import type { PaidIntentFeature } from "@/lib/analytics/types";

export function trackPaidIntent(
  feature: PaidIntentFeature,
  properties?: Record<string, string | number | boolean>,
): void {
  trackEvent("paid_intent", { feature, ...properties });
  trackEvent("paid_feature_clicked", { feature, ...properties });
}
