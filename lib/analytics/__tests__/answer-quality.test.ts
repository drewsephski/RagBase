import { describe, expect, test } from "@jest/globals";
import {
  categorizeChatError,
  getAnswerLengthBucket,
} from "@/lib/analytics/answer-quality";

describe("getAnswerLengthBucket", () => {
  test("maps character counts to buckets", () => {
    expect(getAnswerLengthBucket(50)).toBe("short");
    expect(getAnswerLengthBucket(400)).toBe("medium");
    expect(getAnswerLengthBucket(900)).toBe("long");
    expect(getAnswerLengthBucket(2000)).toBe("very_long");
  });
});

describe("categorizeChatError", () => {
  test("classifies common chat errors", () => {
    expect(categorizeChatError("Message limit reached")).toBe("rate_limit");
    expect(categorizeChatError("Too many messages this hour")).toBe("rate_limit");
    expect(categorizeChatError("Workspace not found")).toBe("auth");
    expect(categorizeChatError("Failed to fetch")).toBe("network");
    expect(categorizeChatError("Something unexpected")).toBe("unknown");
  });
});
