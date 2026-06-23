import { describe, expect, test } from "@jest/globals";
import { ANALYTICS_EVENTS } from "@/lib/analytics/types";

describe("analytics event taxonomy", () => {
  test("includes paywall funnel events", () => {
    expect(ANALYTICS_EVENTS).toEqual(
      expect.arrayContaining([
        "paywall_viewed",
        "paywall_primary_clicked",
        "paywall_waitlist_submitted",
      ]),
    );
  });

  test("includes OCR observability events", () => {
    expect(ANALYTICS_EVENTS).toEqual(
      expect.arrayContaining([
        "ocr_attempted",
        "ocr_completed",
        "ocr_failed",
      ]),
    );
  });

  test("includes billing and recovery events", () => {
    expect(ANALYTICS_EVENTS).toEqual(
      expect.arrayContaining([
        "recovery_link_generated",
        "recovery_link_used",
        "checkout_success_pending",
        "checkout_success_resolved",
        "paywall_subscribe_clicked",
        "billing_portal_opened",
      ]),
    );
  });

  test("includes answer-quality observability events", () => {
    expect(ANALYTICS_EVENTS).toEqual(
      expect.arrayContaining([
        "answer_started",
        "answer_completed",
        "answer_failed",
        "starter_prompt_clicked",
        "source_opened",
        "copy_answer_clicked",
        "answer_feedback_submitted",
        "prompt_deeplink_opened",
        "prompt_link_copied",
      ]),
    );
  });
});
