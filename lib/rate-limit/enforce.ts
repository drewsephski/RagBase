import type { NextRequest } from "next/server";
import { RATE_LIMIT_CONFIG } from "@/lib/rate-limit/config";
import { checkMemoryRateLimit } from "@/lib/rate-limit/memory-store";

export class RateLimitError extends Error {
  status: number;
  retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "RateLimitError";
    this.status = 429;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

function windowMs(): number {
  return RATE_LIMIT_CONFIG.windowSeconds * 1000;
}

function enforce(key: string, limit: number, friendlyMessage: string): void {
  if (!RATE_LIMIT_CONFIG.enabled || limit <= 0) {
    return;
  }

  const result = checkMemoryRateLimit(key, limit, windowMs());

  if (!result.allowed) {
    const minutes = Math.max(1, Math.ceil(result.retryAfterSeconds / 60));
    throw new RateLimitError(
      `${friendlyMessage} Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      result.retryAfterSeconds,
    );
  }
}

export function enforceWorkspaceCreateRateLimit(request: NextRequest): void {
  const ip = getClientIp(request);
  enforce(
    `workspace:create:${ip}`,
    RATE_LIMIT_CONFIG.workspaceCreatePerIp,
    "Too many workspaces were created from this connection.",
  );
}

export function enforceUploadRateLimit(
  request: NextRequest,
  workspaceId: string,
): void {
  const ip = getClientIp(request);
  enforce(
    `upload:workspace:${workspaceId}`,
    RATE_LIMIT_CONFIG.uploadPerWorkspace,
    "This workspace is uploading files too quickly.",
  );
  enforce(
    `upload:ip:${ip}`,
    RATE_LIMIT_CONFIG.uploadPerIp,
    "Too many uploads from this connection.",
  );
}

export function enforceUrlIngestRateLimit(
  request: NextRequest,
  workspaceId: string,
): void {
  const ip = getClientIp(request);
  enforce(
    `url:workspace:${workspaceId}`,
    RATE_LIMIT_CONFIG.urlPerWorkspace,
    "This workspace is adding links too quickly.",
  );
  enforce(
    `url:ip:${ip}`,
    RATE_LIMIT_CONFIG.urlPerIp,
    "Too many links were added from this connection.",
  );
}

export function enforceFreeChatRateLimit(
  request: NextRequest,
  workspaceId: string,
): void {
  const ip = getClientIp(request);
  enforce(
    `chat:free:ip:${ip}`,
    RATE_LIMIT_CONFIG.chatFreePerIp,
    "Too many messages from this connection.",
  );
  enforce(
    `chat:free:workspace:${workspaceId}`,
    RATE_LIMIT_CONFIG.chatFreePerWorkspace,
    "This workspace is sending messages too quickly.",
  );
}

export function enforceWaitlistRateLimit(request: NextRequest): void {
  const ip = getClientIp(request);
  enforce(
    `waitlist:ip:${ip}`,
    RATE_LIMIT_CONFIG.waitlistPerIp,
    "Too many waitlist signups from this connection.",
  );
}
