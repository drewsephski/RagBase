import { Redis } from "@upstash/redis";
import type { RateLimitResult, RateLimitStore } from "@/lib/rate-limit/types";

function buildRedisKey(key: string): string {
  return `ragbase:ratelimit:${key}`;
}

/**
 * Fixed-window counter backed by Upstash Redis. Mirrors the in-memory store
 * semantics: first request in a window sets TTL; subsequent requests INCR
 * until the limit is reached.
 */
export function createRedisRateLimitStore(
  redis: Redis = Redis.fromEnv(),
): RateLimitStore {
  return {
    async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
      if (limit <= 0) {
        return {
          allowed: true,
          remaining: Number.MAX_SAFE_INTEGER,
          retryAfterSeconds: 0,
        };
      }

      const redisKey = buildRedisKey(key);
      const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));

      const count = await redis.incr(redisKey);

      if (count === 1) {
        await redis.expire(redisKey, ttlSeconds);
      }

      const ttl = await redis.ttl(redisKey);
      const retryAfterSeconds =
        ttl > 0 ? ttl : ttlSeconds;

      if (count > limit) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds,
        };
      }

      return {
        allowed: true,
        remaining: limit - count,
        retryAfterSeconds: 0,
      };
    },
  };
}
