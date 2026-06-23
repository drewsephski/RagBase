import { APP_PATH } from "@/lib/domain/site";
import { buildCheckoutReturnLocation, getAppUrl, replaceBrowserUrl } from "@/lib/site";

export const CHECKOUT_WORKSPACE_STORAGE_KEY = "ragbase:checkout-workspace-id";
const CHECKOUT_HANDLED_PREFIX = "ragbase:checkout-handled:";

export type CheckoutReturnStatus = "success" | "cancel";

export interface CheckoutReturnParams {
  status: CheckoutReturnStatus | null;
  sessionId: string | null;
}

export function normalizeAppHostname(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

export function isSameAppHostname(hostname: string): boolean {
  try {
    const appHostname = normalizeAppHostname(new URL(getAppUrl()).hostname);
    return normalizeAppHostname(hostname) === appHostname;
  } catch {
    return false;
  }
}

export function parseCheckoutReturnParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): CheckoutReturnParams {
  const readParam = (key: string): string | null => {
    if (params instanceof URLSearchParams) {
      return params.get(key);
    }

    const value = params[key];
    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value)) {
      return value[0] ?? null;
    }

    return null;
  };

  const checkout = readParam("checkout");
  const status =
    checkout === "success" ? "success" : checkout === "cancel" ? "cancel" : null;

  return {
    status,
    sessionId: readParam("session_id"),
  };
}

export function persistCheckoutWorkspaceId(workspaceId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(CHECKOUT_WORKSPACE_STORAGE_KEY, workspaceId);
  } catch {
    // Ignore storage failures.
  }
}

export function readCheckoutWorkspaceId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return sessionStorage.getItem(CHECKOUT_WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearCheckoutWorkspaceId(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.removeItem(CHECKOUT_WORKSPACE_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function isCheckoutSessionHandled(sessionId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return sessionStorage.getItem(`${CHECKOUT_HANDLED_PREFIX}${sessionId}`) === "1";
  } catch {
    return false;
  }
}

export function markCheckoutSessionHandled(sessionId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(`${CHECKOUT_HANDLED_PREFIX}${sessionId}`, "1");
  } catch {
    // Ignore storage failures.
  }
}

export function clearCheckoutReturnParams(): void {
  replaceBrowserUrl(APP_PATH);
}

export function redirectToCanonicalCheckoutReturn(pathname: string, search: string): void {
  window.location.replace(buildCheckoutReturnLocation(pathname, search));
}
