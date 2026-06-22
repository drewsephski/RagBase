/**
 * Client-safe environment helpers (NEXT_PUBLIC_* and NODE_ENV).
 */

export function getFeedbackUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim();
  return url && url.length > 0 ? url : undefined;
}

export function isDebugPanelEnabled(): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  return process.env.NEXT_PUBLIC_DEBUG_PANEL === "true";
}
