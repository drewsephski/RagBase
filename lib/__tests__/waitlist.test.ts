import { describe, expect, test } from "@jest/globals";
import {
  isWaitlistHoneypotTriggered,
  isWaitlistSubmitTooFast,
  normalizeWaitlistEmail,
  waitlistBodySchema,
  WAITLIST_MIN_SUBMIT_DELAY_MS,
} from "@/lib/waitlist";

describe("waitlist helpers", () => {
  test("normalizes email to lowercase", () => {
    expect(normalizeWaitlistEmail("  User@Example.COM ")).toBe("user@example.com");
  });

  test("detects honeypot when website field is filled", () => {
    expect(isWaitlistHoneypotTriggered("")).toBe(false);
    expect(isWaitlistHoneypotTriggered("   ")).toBe(false);
    expect(isWaitlistHoneypotTriggered("spam-bot")).toBe(true);
  });

  test("rejects submits faster than minimum delay", () => {
    const openedAt = Date.now();
    expect(isWaitlistSubmitTooFast(openedAt, openedAt + 100)).toBe(true);
    expect(
      isWaitlistSubmitTooFast(openedAt, openedAt + WAITLIST_MIN_SUBMIT_DELAY_MS),
    ).toBe(false);
  });

  test("rejects missing formOpenedAt", () => {
    expect(isWaitlistSubmitTooFast(undefined)).toBe(true);
  });

  test("validates waitlist body schema", () => {
    const result = waitlistBodySchema.safeParse({
      email: "user@example.com",
      feature: "full_site_crawl",
      source: "paywall_dialog",
      formOpenedAt: Date.now(),
    });

    expect(result.success).toBe(true);
  });
});
