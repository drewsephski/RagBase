import { memoryRateLimitStore } from "@/lib/rate-limit/memory-store";
import type { RateLimitStore } from "@/lib/rate-limit/types";

function isUpstashRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return Boolean(url && token);
}

function createActiveStore(): RateLimitStore {
  if (isUpstashRedisConfigured()) {
    // Lazy require keeps @upstash/redis out of the default bundle and Jest graph.
    const { createRedisRateLimitStore } =
      require("@/lib/rate-limit/redis-store") as typeof import("@/lib/rate-limit/redis-store");
    return createRedisRateLimitStore();
  }

  return memoryRateLimitStore;
}

let activeStore: RateLimitStore | null = null;

export function getRateLimitStore(): RateLimitStore {
  if (!activeStore) {
    activeStore = createActiveStore();
  }

  return activeStore;
}

/** Resets the singleton store (unit tests). */
export function resetRateLimitStore(): void {
  activeStore = null;
}
