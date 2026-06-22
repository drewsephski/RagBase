import { describe, expect, test, afterEach } from "@jest/globals";
import {
  buildPostHogCaptureBody,
  getPostHogProjectApiKey,
} from "@/lib/analytics/providers/posthog";
import { ANALYTICS_EVENTS } from "@/lib/analytics/types";

describe("getPostHogProjectApiKey", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  test("prefers project token and ignores personal API keys", () => {
    process.env = {
      ...originalEnv,
      POSTHOG_API_KEY: "phx_personal_key",
      POSTHOG_PROJECT_API_KEY: "phc_project_key",
      NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_public_key",
    };

    expect(getPostHogProjectApiKey()).toBe("phc_project_key");
  });

  test("falls back to public project token when server key is unset", () => {
    process.env = {
      ...originalEnv,
      POSTHOG_PROJECT_API_KEY: undefined,
      POSTHOG_API_KEY: undefined,
      NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_public_key",
    };

    expect(getPostHogProjectApiKey()).toBe("phc_public_key");
  });
});

describe("buildPostHogCaptureBody", () => {
  test("uses anonymous capture settings and safe answer-quality metadata", () => {
    const body = buildPostHogCaptureBody("phc_test", {
      event: "answer_completed",
      anonymousId: "11111111-1111-4111-8111-111111111111",
      timestamp: 1_700_000_000_000,
      properties: {
        source_count: 2,
        workspace_id: "22222222-2222-4222-8222-222222222222",
        model: "free",
        latency_ms: 1200,
        citation_count: 3,
        has_citations: true,
        answer_length_bucket: "medium",
      },
    });

    expect(body).toMatchObject({
      api_key: "phc_test",
      event: "answer_completed",
      distinct_id: "11111111-1111-4111-8111-111111111111",
      properties: {
        source_count: 2,
        workspace_id: "22222222-2222-4222-8222-222222222222",
        model: "free",
        latency_ms: 1200,
        citation_count: 3,
        has_citations: true,
        answer_length_bucket: "medium",
        $lib: "ragbase",
        $process_person_profile: false,
      },
    });
  });

  test("covers all answer-quality analytics events", () => {
    const answerQualityEvents = [
      "answer_started",
      "answer_completed",
      "answer_failed",
      "starter_prompt_clicked",
      "source_opened",
      "copy_answer_clicked",
      "answer_feedback_submitted",
    ] as const;

    for (const event of answerQualityEvents) {
      expect(ANALYTICS_EVENTS).toContain(event);
    }
  });
});
