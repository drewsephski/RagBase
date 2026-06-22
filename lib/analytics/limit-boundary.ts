import { trackPaidIntent } from "@/lib/analytics/paid-intent";
import { ApiError } from "@/lib/api/client";

export function trackLimitBoundary(error: unknown): void {
  if (!(error instanceof ApiError)) {
    return;
  }

  const isLimit =
    error.status === 429 ||
    /limit reached|too many|maximum is/i.test(error.message);

  if (isLimit) {
    trackPaidIntent("larger_limits", { status: error.status });
  }
}
