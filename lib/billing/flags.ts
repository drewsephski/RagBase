function readBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === "") {
    return defaultValue;
  }
  return value.trim().toLowerCase() === "true";
}

export function isBillingEnabled(): boolean {
  return readBooleanEnv(process.env.NEXT_PUBLIC_BILLING_ENABLED, false);
}

export function isWebhooksEnabled(): boolean {
  return readBooleanEnv(process.env.STRIPE_WEBHOOKS_ENABLED, false);
}
