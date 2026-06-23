import { describe, expect, test, beforeEach, afterEach } from "@jest/globals";
import type { NextRequest } from "next/server";
import { enforceBillingReclaimRateLimit } from "@/lib/rate-limit/enforce";
import { resetRateLimitStore } from "@/lib/rate-limit/store";

function createRequest(ip = "203.0.113.10"): NextRequest {
  return {
    headers: new Headers({
      "x-forwarded-for": ip,
    }),
  } as NextRequest;
}

describe("enforceBillingReclaimRateLimit", () => {
  const originalEnabled = process.env.RATE_LIMIT_ENABLED;
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    resetRateLimitStore();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.RATE_LIMIT_ENABLED = "true";
  });

  afterEach(() => {
    process.env.RATE_LIMIT_ENABLED = originalEnabled;
    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    resetRateLimitStore();
  });

  test("returns a friendly rate limit error after repeated reclaim attempts", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await enforceBillingReclaimRateLimit(createRequest(), "ws_1");
    }

    await expect(
      enforceBillingReclaimRateLimit(createRequest(), "ws_1"),
    ).rejects.toMatchObject({
      name: "RateLimitError",
      status: 429,
      message: expect.stringContaining("Pro subscription restore attempts"),
    });
  });
});
