import { z } from "zod";

const WAITLIST_FEATURES = ["full_site_crawl"] as const;

export const WAITLIST_MIN_SUBMIT_DELAY_MS = 800;
export const WAITLIST_HONEYPOT_FIELD = "website";

export const waitlistBodySchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email."),
  feature: z.enum(WAITLIST_FEATURES),
  source: z.string().trim().max(64).optional(),
  [WAITLIST_HONEYPOT_FIELD]: z.string().optional(),
  formOpenedAt: z.number().int().positive().optional(),
});

export function normalizeWaitlistEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isWaitlistHoneypotTriggered(website: string | undefined): boolean {
  return Boolean(website?.trim());
}

export function isWaitlistSubmitTooFast(
  formOpenedAt: number | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (formOpenedAt === undefined) {
    return true;
  }

  return nowMs - formOpenedAt < WAITLIST_MIN_SUBMIT_DELAY_MS;
}
