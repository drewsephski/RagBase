function readInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export const RATE_LIMIT_CONFIG = {
  enabled: process.env.RATE_LIMIT_ENABLED !== "false",
  windowSeconds: readInt("RATE_LIMIT_WINDOW_SECONDS", 3600),
  workspaceCreatePerIp: readInt("RATE_LIMIT_WORKSPACE_CREATE_PER_IP", 20),
  uploadPerWorkspace: readInt("RATE_LIMIT_UPLOAD_PER_WORKSPACE", 30),
  uploadPerIp: readInt("RATE_LIMIT_UPLOAD_PER_IP", 60),
  urlPerWorkspace: readInt("RATE_LIMIT_URL_PER_WORKSPACE", 30),
  urlPerIp: readInt("RATE_LIMIT_URL_PER_IP", 60),
  chatFreePerIp: readInt("RATE_LIMIT_CHAT_FREE_PER_IP", 120),
  chatFreePerWorkspace: readInt("RATE_LIMIT_CHAT_FREE_PER_WORKSPACE", 0),
  waitlistPerIp: readInt("RATE_LIMIT_WAITLIST_PER_IP", 10),
  recoveryCreatePerWorkspace: readInt("RATE_LIMIT_RECOVERY_CREATE_PER_WORKSPACE", 5),
  recoveryExchangePerIp: readInt("RATE_LIMIT_RECOVERY_EXCHANGE_PER_IP", 10),
  billingReclaimPerWorkspace: readInt("RATE_LIMIT_BILLING_RECLAIM_PER_WORKSPACE", 5),
  billingReclaimPerIp: readInt("RATE_LIMIT_BILLING_RECLAIM_PER_IP", 10),
} as const;
