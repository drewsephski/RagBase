import { describe, expect, test, beforeEach, afterEach } from "@jest/globals";
import { hashRecoveryToken } from "@/lib/workspace/recovery";

const ORIGINAL_ENV = { ...process.env };

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
