const RECOVERY_CONFIRMED_PREFIX = "ragbase_recovery_confirmed_";

export function getRecoveryConfirmedKey(workspaceId: string): string {
  return `${RECOVERY_CONFIRMED_PREFIX}${workspaceId}`;
}

export function isRecoveryConfirmedLocally(workspaceId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return localStorage.getItem(getRecoveryConfirmedKey(workspaceId)) === "true";
  } catch {
    return false;
  }
}

export function setRecoveryConfirmedLocally(workspaceId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(getRecoveryConfirmedKey(workspaceId), "true");
  } catch {
    // Ignore storage failures.
  }
}

export function clearRecoveryConfirmedLocally(workspaceId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(getRecoveryConfirmedKey(workspaceId));
  } catch {
    // Ignore storage failures.
  }
}
