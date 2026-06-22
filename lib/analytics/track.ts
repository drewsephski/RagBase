import { sanitizeAnalyticsProperties } from "@/lib/analytics/sanitize";
import type {
  AnalyticsEvent,
  AnalyticsProperties,
} from "@/lib/analytics/types";

export {
  ANALYTICS_EVENTS,
  PAID_INTENT_FEATURES,
  type AnalyticsEvent,
  type PaidIntentFeature,
} from "@/lib/analytics/types";

export { trackPaidIntent } from "@/lib/analytics/paid-intent";

const ANONYMOUS_ID_KEY = "ragbase_analytics_id";

function getAnonymousId(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    let id = sessionStorage.getItem(ANONYMOUS_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(ANONYMOUS_ID_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

export function trackEvent(
  event: AnalyticsEvent,
  properties?: AnalyticsProperties,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    event,
    properties: sanitizeAnalyticsProperties(properties),
    timestamp: Date.now(),
    anonymousId: getAnonymousId(),
  };

  const body = JSON.stringify(payload);

  if (typeof navigator.sendBeacon === "function") {
    const sent = navigator.sendBeacon(
      "/api/analytics",
      new Blob([body], { type: "application/json" }),
    );

    if (sent) {
      return;
    }
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must never block product flows.
  });
}
