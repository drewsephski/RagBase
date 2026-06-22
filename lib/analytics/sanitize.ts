import type { AnalyticsProperties } from "@/lib/analytics/types";

const BLOCKED_PROPERTY_KEYS = new Set([
  "message",
  "content",
  "text",
  "prompt",
  "document",
  "raw",
  "answer",
  "query",
  "response",
  "snippet",
  "body",
  "usermessage",
  "assistantmessage",
  "key",
  "secret",
  "password",
  "token",
  "apikey",
  "openrouterkey",
  "openrouter_key",
  "workspacesecret",
  "workspace_secret",
  "authorization",
]);

const MAX_PROPERTY_VALUE_LENGTH = 200;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function sanitizeAnalyticsProperties(
  properties?: AnalyticsProperties,
): AnalyticsProperties | undefined {
  if (!properties) {
    return undefined;
  }

  const sanitized: AnalyticsProperties = {};

  for (const [key, value] of Object.entries(properties)) {
    const normalizedKey = normalizeKey(key);

    if (BLOCKED_PROPERTY_KEYS.has(normalizedKey)) {
      continue;
    }

    if (typeof value === "string" && value.length > MAX_PROPERTY_VALUE_LENGTH) {
      sanitized[key] = value.slice(0, MAX_PROPERTY_VALUE_LENGTH);
      continue;
    }

    sanitized[key] = value;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}
