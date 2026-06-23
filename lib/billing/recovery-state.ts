const RECOVERY_CONFIRMED_PREFIX = "ragbase_recovery_confirmed_";
const RECOVERY_PROMPT_DISMISSED_PREFIX = "ragbase_recovery_prompt_dismissed_";

function getRecoveryConfirmedKey(workspaceId: string): string {
  return `${RECOVERY_CONFIRMED_PREFIX}${workspaceId}`;
}

function getRecoveryPromptDismissedKey(workspaceId: string): string {
  return `${RECOVERY_PROMPT_DISMISSED_PREFIX}${workspaceId}`;
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

export function isRecoveryPromptDismissedLocally(workspaceId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return localStorage.getItem(getRecoveryPromptDismissedKey(workspaceId)) === "true";
  } catch {
    return false;
  }
}

export function setRecoveryPromptDismissedLocally(workspaceId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(getRecoveryPromptDismissedKey(workspaceId), "true");
  } catch {
    // Ignore storage failures.
  }
}

export function isRecoverySaved(
  workspaceId: string,
  recoveryLinkConfirmed: boolean,
): boolean {
  return recoveryLinkConfirmed || isRecoveryConfirmedLocally(workspaceId);
}
