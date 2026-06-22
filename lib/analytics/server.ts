import { sanitizeAnalyticsProperties } from "@/lib/analytics/sanitize";
import { createConsoleAnalyticsProvider } from "@/lib/analytics/providers/console";
import { createPostHogAnalyticsProvider } from "@/lib/analytics/providers/posthog";
import { createVercelAnalyticsProvider } from "@/lib/analytics/providers/vercel";
import type { AnalyticsProvider } from "@/lib/analytics/providers/types";
import type { AnalyticsPayload } from "@/lib/analytics/types";

let cachedProviders: AnalyticsProvider[] | null = null;

function getAnalyticsProviders(): AnalyticsProvider[] {
  if (cachedProviders) {
    return cachedProviders;
  }

  const providers: AnalyticsProvider[] = [];

  const posthog = createPostHogAnalyticsProvider();
  if (posthog) {
    providers.push(posthog);
  } else if (process.env.NODE_ENV === "production") {
    console.warn(
      "[analytics] PostHog project token (phc_*) is not set — events will not reach PostHog in production",
    );
  }

  const vercel = createVercelAnalyticsProvider();
  if (vercel) {
    providers.push(vercel);
  }

  if (process.env.NODE_ENV !== "production" || providers.length === 0) {
    providers.push(createConsoleAnalyticsProvider());
  }

  cachedProviders = providers;
  return providers;
}

export async function captureServerAnalyticsEvent(
  payload: AnalyticsPayload,
): Promise<void> {
  const sanitized: AnalyticsPayload = {
    ...payload,
    properties: sanitizeAnalyticsProperties(payload.properties),
  };

  const providers = getAnalyticsProviders();

  await Promise.allSettled(
    providers.map(async (provider) => {
      try {
        await provider.capture(sanitized);
      } catch (error) {
        console.error(`Analytics provider "${provider.name}" failed:`, error);
      }
    }),
  );
}
