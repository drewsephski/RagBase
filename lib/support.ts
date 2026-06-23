const DEFAULT_SUPPORT_EMAIL = "support@ragbase.dev";

export function getSupportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT_EMAIL;
}

export function supportMailto(subject?: string): string {
  const email = getSupportEmail();
  if (!subject) {
    return `mailto:${email}`;
  }
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
