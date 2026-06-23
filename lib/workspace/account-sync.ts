import {
  type StoredWorkspace,
} from "@/lib/domain/definitions";
import { LIMITS } from "@/lib/domain/definitions";
import type { AccountWorkspaceSummary } from "@/lib/workspace/account";
import { loadRegistry, notifyWorkspaceRegistryUpdated } from "@/lib/workspace/registry";
import { WORKSPACE_REGISTRY_KEY } from "@/lib/workspace/keys";

export function createAccountLinkedWorkspace(
  summary: AccountWorkspaceSummary,
): StoredWorkspace {
  return {
    id: summary.id,
    name: summary.name,
    createdAt: summary.createdAt,
    accountLinked: true,
  };
}

function toAccountLinkedWorkspace(
  existing: StoredWorkspace,
  summary: AccountWorkspaceSummary,
): StoredWorkspace {
  return {
    id: existing.id,
    name: existing.name || summary.name,
    createdAt: existing.createdAt,
    accountLinked: true,
    ...(existing.templateId ? { templateId: existing.templateId } : {}),
  };
}

export function mergeAccountWorkspaces(
  accountWorkspaces: AccountWorkspaceSummary[],
): StoredWorkspace[] {
  const registry = loadRegistry();
  let next = [...registry];

  for (const summary of accountWorkspaces) {
    const index = next.findIndex((workspace) => workspace.id === summary.id);

    if (index >= 0) {
      const existing = next[index];
      if (!existing) {
        continue;
      }

      // Drop any local secret — account-owned workspaces authenticate via session.
      next[index] = toAccountLinkedWorkspace(existing, summary);
      continue;
    }

    if (next.length >= LIMITS.MAX_WORKSPACES) {
      continue;
    }

    next = [...next, createAccountLinkedWorkspace(summary)];
  }

  return next;
}

export async function fetchAccountWorkspaces(): Promise<AccountWorkspaceSummary[]> {
  const response = await fetch("/api/workspaces/mine");
  if (!response.ok) {
    return [];
  }

  const body = (await response.json()) as { workspaces?: AccountWorkspaceSummary[] };
  return body.workspaces ?? [];
}

export async function syncAccountWorkspacesToRegistry(): Promise<StoredWorkspace[]> {
  const accountWorkspaces = await fetchAccountWorkspaces();
  const merged = mergeAccountWorkspaces(accountWorkspaces);
  localStorage.setItem(WORKSPACE_REGISTRY_KEY, JSON.stringify(merged));
  notifyWorkspaceRegistryUpdated();
  return merged;
}

export async function linkWorkspaceToAccount(
  workspaceHeaders: { "X-Workspace-Id": string; "X-Workspace-Secret"?: string },
): Promise<void> {
  const response = await fetch("/api/workspaces/link", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Workspace-Id": workspaceHeaders["X-Workspace-Id"],
      ...(workspaceHeaders["X-Workspace-Secret"]
        ? { "X-Workspace-Secret": workspaceHeaders["X-Workspace-Secret"] }
        : {}),
    },
  });

  if (!response.ok) {
    throw new Error("Could not link workspace to your account.");
  }
}
