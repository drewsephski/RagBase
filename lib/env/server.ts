/**
 * Server-only environment helpers.
 */

export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return key;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return secret;
}

export function getRecoveryTokenPepper(): string {
  const pepper = process.env.RECOVERY_TOKEN_PEPPER?.trim();
  if (!pepper) {
    throw new Error("RECOVERY_TOKEN_PEPPER is not configured");
  }
  return pepper;
}
