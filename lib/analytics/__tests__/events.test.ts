import { describe, expect, test } from "@jest/globals";
import { ANALYTICS_EVENTS } from "@/lib/analytics/types";

describe("analytics event taxonomy", () => {
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
