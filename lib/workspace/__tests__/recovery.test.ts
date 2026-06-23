import { describe, expect, test, beforeEach, afterEach, jest } from "@jest/globals";
import {
  exchangeRecoveryToken,
  hashRecoveryToken,
  RecoveryTokenError,
} from "@/lib/workspace/recovery";

const ORIGINAL_ENV = { ...process.env };

jest.mock("@/lib/workspace/crypto", () => ({
  generateWorkspaceSecret: jest.fn(() => "new-workspace-secret-value-1234567890"),
  hashSecret: jest.fn(async () => "hashed-secret"),
}));

describe("hashRecoveryToken", () => {
  beforeEach(() => {
    process.env.RECOVERY_TOKEN_PEPPER = "test-pepper";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test("returns deterministic sha256 hex hash", () => {
    const first = hashRecoveryToken("abc123");
    const second = hashRecoveryToken("abc123");

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  test("changes when token changes", () => {
    const first = hashRecoveryToken("token-a");
    const second = hashRecoveryToken("token-b");

    expect(first).not.toBe(second);
  });
});

describe("exchangeRecoveryToken", () => {
  beforeEach(() => {
    process.env.RECOVERY_TOKEN_PEPPER = "test-pepper";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.clearAllMocks();
  });

  test("revokes token after successful exchange", async () => {
    const tokenUpdate = jest.fn(() => ({
      eq: () => ({
        is: () => ({
          select: () => Promise.resolve({ data: [{ id: "token-row-1" }], error: null }),
        }),
      }),
    }));

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === "workspace_recovery_tokens") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: "token-row-1",
                      workspace_id: "ws-1",
                      expires_at: new Date(Date.now() + 60_000).toISOString(),
                      revoked_at: null,
                    },
                    error: null,
                  }),
              }),
            }),
            update: tokenUpdate,
          };
        }

        if (table === "workspaces") {
          return {
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const result = await exchangeRecoveryToken(
      supabase as never,
      "recovery-token-value",
    );

    expect(result.workspaceId).toBe("ws-1");
    expect(result.workspaceSecret.length).toBeGreaterThanOrEqual(32);
    expect(tokenUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        revoked_at: expect.any(String),
        last_used_at: expect.any(String),
      }),
    );
  });

  test("rejects reuse when token is already revoked", async () => {
    const supabase = {
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  id: "token-row-1",
                  workspace_id: "ws-1",
                  expires_at: new Date(Date.now() + 60_000).toISOString(),
                  revoked_at: new Date().toISOString(),
                },
                error: null,
              }),
          }),
        }),
      })),
    };

    await expect(exchangeRecoveryToken(supabase as never, "used-token")).rejects.toBeInstanceOf(
      RecoveryTokenError,
    );
  });

  test("rejects concurrent reuse when revoke update matches zero rows", async () => {
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === "workspace_recovery_tokens") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: "token-row-1",
                      workspace_id: "ws-1",
                      expires_at: new Date(Date.now() + 60_000).toISOString(),
                      revoked_at: null,
                    },
                    error: null,
                  }),
              }),
            }),
            update: () => ({
              eq: () => ({
                is: () => ({
                  select: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          };
        }

        if (table === "workspaces") {
          return {
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    await expect(
      exchangeRecoveryToken(supabase as never, "race-token"),
    ).rejects.toBeInstanceOf(RecoveryTokenError);
  });
});
