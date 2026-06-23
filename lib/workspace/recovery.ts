import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRecoveryTokenPepper } from "@/lib/env/server";
import {
  generateWorkspaceSecret,
  hashSecret,
} from "@/lib/workspace/crypto";
import { getRecoveryUrl } from "@/lib/site";

const DEFAULT_RECOVERY_TOKEN_TTL_DAYS = 90;

function readRecoveryTokenTtlDays(): number {
  const raw = process.env.RECOVERY_TOKEN_TTL_DAYS?.trim();
  if (!raw) {
    return DEFAULT_RECOVERY_TOKEN_TTL_DAYS;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RECOVERY_TOKEN_TTL_DAYS;
}

export function hashRecoveryToken(token: string): string {
  return createHash("sha256")
    .update(`${token}:${getRecoveryTokenPepper()}`)
    .digest("hex");
}

function generateRecoveryToken(): string {
  return randomBytes(32).toString("base64url");
}

export interface RecoveryLinkResult {
  url: string;
  expiresAt: string;
}

export async function createRecoveryLink(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<RecoveryLinkResult> {
  const token = generateRecoveryToken();
  const tokenHash = hashRecoveryToken(token);
  const ttlDays = readRecoveryTokenTtlDays();
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + ttlDays);

  const now = new Date().toISOString();

  const { error: revokeError } = await supabase
    .from("workspace_recovery_tokens")
    .update({ revoked_at: now })
    .eq("workspace_id", workspaceId)
    .is("revoked_at", null);

  if (revokeError) {
    throw new Error(`Failed to revoke prior recovery links: ${revokeError.message}`);
  }

  const { error: insertError } = await supabase.from("workspace_recovery_tokens").insert({
    workspace_id: workspaceId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (insertError) {
    throw new Error(`Failed to create recovery link: ${insertError.message}`);
  }

  return {
    url: getRecoveryUrl(token),
    expiresAt: expiresAt.toISOString(),
  };
}

export interface RecoveryExchangeResult {
  workspaceId: string;
  workspaceSecret: string;
}

export class RecoveryTokenError extends Error {
  status: number;

  constructor(message = "This recovery link is invalid or expired.", status = 400) {
    super(message);
    this.name = "RecoveryTokenError";
    this.status = status;
  }
}

export async function exchangeRecoveryToken(
  supabase: SupabaseClient,
  token: string,
): Promise<RecoveryExchangeResult> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new RecoveryTokenError();
  }

  const tokenHash = hashRecoveryToken(trimmed);
  const now = new Date().toISOString();

  const { data: tokenRow, error: tokenError } = await supabase
    .from("workspace_recovery_tokens")
    .select("id, workspace_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenError) {
    throw new Error(`Failed to look up recovery token: ${tokenError.message}`);
  }

  if (!tokenRow || tokenRow.revoked_at) {
    throw new RecoveryTokenError();
  }

  if (new Date(tokenRow.expires_at as string) <= new Date()) {
    throw new RecoveryTokenError();
  }

  const workspaceId = tokenRow.workspace_id as string;
  const newSecret = generateWorkspaceSecret();
  const secretHash = await hashSecret(newSecret);

  const { error: workspaceError } = await supabase
    .from("workspaces")
    .update({ secret_hash: secretHash })
    .eq("id", workspaceId);

  if (workspaceError) {
    throw new Error(`Failed to rotate workspace secret: ${workspaceError.message}`);
  }

  const { data: revokedRows, error: usedError } = await supabase
    .from("workspace_recovery_tokens")
    .update({ last_used_at: now, revoked_at: now })
    .eq("id", tokenRow.id)
    .is("revoked_at", null)
    .select("id");

  if (usedError) {
    throw new Error(`Failed to revoke recovery token: ${usedError.message}`);
  }

  if (!revokedRows?.length) {
    throw new RecoveryTokenError();
  }

  return {
    workspaceId,
    workspaceSecret: newSecret,
  };
}

export async function revokeRecoveryLinks(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<void> {
  const { error } = await supabase
    .from("workspace_recovery_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .is("revoked_at", null);

  if (error) {
    throw new Error(`Failed to revoke recovery links: ${error.message}`);
  }
}
