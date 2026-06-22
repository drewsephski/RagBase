import { describe, expect, test, beforeEach } from "@jest/globals";
import {
  checkMemoryRateLimit,
  resetMemoryRateLimitStore,
} from "@/lib/rate-limit/memory-store";

describe("checkMemoryRateLimit", () => {
  beforeEach(() => {
    resetMemoryRateLimitStore();
  });

  test("allows requests under the limit", () => {
    const first = checkMemoryRateLimit("upload:ip:1.2.3.4", 2, 60_000);
    const second = checkMemoryRateLimit("upload:ip:1.2.3.4", 2, 60_000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });

  test("blocks requests over the limit", () => {
    checkMemoryRateLimit("upload:ip:1.2.3.4", 1, 60_000);
    const blocked = checkMemoryRateLimit("upload:ip:1.2.3.4", 1, 60_000);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
