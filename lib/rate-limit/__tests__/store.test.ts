import { describe, expect, test, beforeEach, afterEach } from "@jest/globals";
import {
  getRateLimitStore,
  resetRateLimitStore,
} from "@/lib/rate-limit/store";
import { memoryRateLimitStore } from "@/lib/rate-limit/memory-store";

describe("getRateLimitStore", () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    resetRateLimitStore();
  });

  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    resetRateLimitStore();
  });

  test("uses memory store when Upstash env vars are missing", () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    expect(getRateLimitStore()).toBe(memoryRateLimitStore);
  });

  test("uses memory store when Upstash env vars are empty", () => {
    process.env.UPSTASH_REDIS_REST_URL = "";
    process.env.UPSTASH_REDIS_REST_TOKEN = "";

    expect(getRateLimitStore()).toBe(memoryRateLimitStore);
  });
});
