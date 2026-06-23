const DEFAULT_APP_URL = "https://www.ragbase.dev";
const DEFAULT_PRO_PRICE_DISPLAY = "$9 a month";

export function getAppUrl(): string {
  const fromAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromAppUrl) {
    return fromAppUrl.replace(/\/$/, "");
  }

  const fromSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromSiteUrl) {
    return fromSiteUrl.replace(/\/$/, "");
  }

  return DEFAULT_APP_URL;
}

export function isSameAppOrigin(origin: string): boolean {
  try {
    return new URL(origin).origin === new URL(getAppUrl()).origin;
  } catch {
    return false;
  }
}

export function buildCheckoutReturnLocation(pathname: string, search: string): string {
  return `${getAppUrl()}${pathname}${search}`;
}

export function replaceBrowserUrl(path: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(window.history.state, "", path);
}

export function getProPriceDisplay(): string {
  const fromEnv = process.env.NEXT_PUBLIC_PRO_PRICE_DISPLAY?.trim();
  if (fromEnv && /\d/.test(fromEnv)) {
    return fromEnv;
  }

  return DEFAULT_PRO_PRICE_DISPLAY;
}

export function getRecoveryUrl(token: string): string {
  return `${getAppUrl()}/app/recover?token=${encodeURIComponent(token)}`;
}
