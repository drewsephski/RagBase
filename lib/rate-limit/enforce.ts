import type { NextRequest } from "next/server";
import { RATE_LIMIT_CONFIG } from "@/lib/rate-limit/config";
import { getRateLimitStore } from "@/lib/rate-limit/store";

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

function getClientIp(request: NextRequest): string {
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

async function enforce(
  key: string,
  limit: number,
  friendlyMessage: string,
): Promise<void> {
  if (!RATE_LIMIT_CONFIG.enabled || limit <= 0) {
    return;
  }

  const result = await getRateLimitStore().check(key, limit, windowMs());

  if (!result.allowed) {
    const minutes = Math.max(1, Math.ceil(result.retryAfterSeconds / 60));
    throw new RateLimitError(
      `${friendlyMessage} Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      result.retryAfterSeconds,
    );
  }
}

export async function enforceWorkspaceCreateRateLimit(
  request: NextRequest,
): Promise<void> {
  const ip = getClientIp(request);
  await enforce(
    `workspace:create:${ip}`,
    RATE_LIMIT_CONFIG.workspaceCreatePerIp,
    "Too many workspaces were created from this connection.",
  );
}

export async function enforceUploadRateLimit(
  request: NextRequest,
  workspaceId: string,
): Promise<void> {
  const ip = getClientIp(request);
  await enforce(
    `upload:workspace:${workspaceId}`,
    RATE_LIMIT_CONFIG.uploadPerWorkspace,
    "This workspace is uploading files too quickly.",
  );
  await enforce(
    `upload:ip:${ip}`,
    RATE_LIMIT_CONFIG.uploadPerIp,
    "Too many uploads from this connection.",
  );
}

export async function enforceUrlIngestRateLimit(
  request: NextRequest,
  workspaceId: string,
): Promise<void> {
  const ip = getClientIp(request);
  await enforce(
    `url:workspace:${workspaceId}`,
    RATE_LIMIT_CONFIG.urlPerWorkspace,
    "This workspace is adding links too quickly.",
  );
  await enforce(
    `url:ip:${ip}`,
    RATE_LIMIT_CONFIG.urlPerIp,
    "Too many links were added from this connection.",
  );
}

export async function enforceFreeChatRateLimit(
  request: NextRequest,
  workspaceId: string,
): Promise<void> {
  const ip = getClientIp(request);
  await enforce(
    `chat:free:ip:${ip}`,
    RATE_LIMIT_CONFIG.chatFreePerIp,
    "Too many messages from this connection.",
  );
  await enforce(
    `chat:free:workspace:${workspaceId}`,
    RATE_LIMIT_CONFIG.chatFreePerWorkspace,
    "This workspace is sending messages too quickly.",
  );
}

export async function enforceWaitlistRateLimit(
  request: NextRequest,
): Promise<void> {
  const ip = getClientIp(request);
  await enforce(
    `waitlist:ip:${ip}`,
    RATE_LIMIT_CONFIG.waitlistPerIp,
    "Too many waitlist signups from this connection.",
  );
}

export async function enforceRecoveryCreateRateLimit(
  _request: NextRequest,
  workspaceId: string,
): Promise<void> {
  await enforce(
    `recovery:create:${workspaceId}`,
    RATE_LIMIT_CONFIG.recoveryCreatePerWorkspace,
    "Too many recovery links were created for this workspace.",
  );
}

export async function enforceRecoveryExchangeRateLimit(
  request: NextRequest,
): Promise<void> {
  const ip = getClientIp(request);
  await enforce(
    `recovery:exchange:${ip}`,
    RATE_LIMIT_CONFIG.recoveryExchangePerIp,
    "Too many recovery attempts from this connection.",
  );
}

export async function enforceBillingReclaimRateLimit(
  request: NextRequest,
  workspaceId: string,
): Promise<void> {
  const ip = getClientIp(request);
  await enforce(
    `billing:reclaim:workspace:${workspaceId}`,
    RATE_LIMIT_CONFIG.billingReclaimPerWorkspace,
    "Too many Pro subscription restore attempts for this workspace.",
  );
  await enforce(
    `billing:reclaim:ip:${ip}`,
    RATE_LIMIT_CONFIG.billingReclaimPerIp,
    "Too many Pro subscription restore attempts from this connection.",
  );
}
