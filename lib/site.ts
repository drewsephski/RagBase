const DEFAULT_APP_URL = "https://www.ragbase.dev";
const DEFAULT_PRO_PRICE_DISPLAY = "$9/mo";

export function getAppUrl(): string {
  const fromAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromAppUrl) {
    return fromAppUrl.replace(/\/$/, "");
  }

  const fromSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromSiteUrl) {
    return fromSiteUrl.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return DEFAULT_APP_URL;
}

export function getProPriceDisplay(): string {
  return process.env.NEXT_PUBLIC_PRO_PRICE_DISPLAY?.trim() || DEFAULT_PRO_PRICE_DISPLAY;
}

export function getRecoveryUrl(token: string): string {
  return `${getAppUrl()}/app/recover?token=${encodeURIComponent(token)}`;
}
