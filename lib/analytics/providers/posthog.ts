import type { AnalyticsProvider } from "@/lib/analytics/providers/types";
import type { AnalyticsPayload } from "@/lib/analytics/types";

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

function getPostHogHost(): string {
  return (
    process.env.POSTHOG_HOST?.trim() ||
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
    DEFAULT_POSTHOG_HOST
  );
}

/** Project API key (phc_*) for the Capture API — not a personal API key (phx_*). */
export function getPostHogProjectApiKey(): string | null {
  const candidates = [
    process.env.POSTHOG_PROJECT_API_KEY,
    process.env.POSTHOG_API_KEY,
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("phx_")) {
      continue;
    }

    if (trimmed.startsWith("phc_")) {
      return trimmed;
    }
  }

  return null;
}

export function buildPostHogCaptureBody(
  apiKey: string,
  payload: AnalyticsPayload,
): Record<string, unknown> {
  const distinctId = payload.anonymousId ?? "anonymous";

  return {
    api_key: apiKey,
    event: payload.event,
    distinct_id: distinctId,
    properties: {
      ...payload.properties,
      $lib: "ragbase",
      // Anonymous no-auth app: avoid creating person profiles for session UUIDs.
      $process_person_profile: false,
    },
    timestamp: new Date(payload.timestamp).toISOString(),
  };
}

export function createPostHogAnalyticsProvider(): AnalyticsProvider | null {
  const apiKey = getPostHogProjectApiKey();
  if (!apiKey) {
    return null;
  }

  const captureUrl = `${getPostHogHost().replace(/\/$/, "")}/i/v0/e/`;

  return {
    name: "posthog",
    async capture(payload: AnalyticsPayload): Promise<void> {
      const response = await fetch(captureUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPostHogCaptureBody(apiKey, payload)),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "unknown error");
        console.error(
          `[analytics:posthog] capture failed (${response.status}): ${detail.slice(0, 200)}`,
        );
      }
    },
  };
}
