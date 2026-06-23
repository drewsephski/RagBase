import type { AnalyticsProperties } from "@/lib/analytics/types";

const ANSWER_LENGTH_BUCKETS = [
  "short",
  "medium",
  "long",
  "very_long",
] as const;

export type AnswerLengthBucket = (typeof ANSWER_LENGTH_BUCKETS)[number];

const ANSWER_FEEDBACK_REASONS = [
  "incorrect",
  "missing_source",
  "too_vague",
  "not_found",
  "other",
] as const;

export type AnswerFeedbackReason = (typeof ANSWER_FEEDBACK_REASONS)[number];

export function getAnswerLengthBucket(charCount: number): AnswerLengthBucket {
  if (charCount < 200) {
    return "short";
  }
  if (charCount < 600) {
    return "medium";
  }
  if (charCount < 1500) {
    return "long";
  }
  return "very_long";
}

export function categorizeChatError(message: string): string {
  if (/limit reached|too many messages|429/i.test(message)) {
    return "rate_limit";
  }
  if (/rate limit|retry/i.test(message)) {
    return "rate_limit";
  }
  if (/unauthorized|workspace/i.test(message)) {
    return "auth";
  }
  if (/network|fetch failed|failed to fetch/i.test(message)) {
    return "network";
  }
  return "unknown";
}

export interface AnswerAnalyticsContext {
  sourceCount: number;
  workspaceId?: string;
  model?: string;
}

export function buildAnswerAnalyticsProperties(
  context: AnswerAnalyticsContext,
  extras?: AnalyticsProperties,
): AnalyticsProperties {
  return {
    source_count: context.sourceCount,
    ...(context.workspaceId ? { workspace_id: context.workspaceId } : {}),
    ...(context.model ? { model: context.model } : {}),
    ...extras,
  };
}
