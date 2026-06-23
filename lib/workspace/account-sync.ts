import {
  type StoredWorkspace,
} from "@/lib/domain/definitions";
import { LIMITS } from "@/lib/domain/definitions";
import type { AccountWorkspaceSummary } from "@/lib/workspace/account";
import { loadRegistry, notifyWorkspaceRegistryUpdated } from "@/lib/workspace/registry";
import { WORKSPACE_REGISTRY_KEY } from "@/lib/workspace/keys";
import { apiJson } from "@/lib/api/client";
import { ApiError } from "@/lib/api/api-error";
import {
  getReclaimErrorMessage,
  type ReclaimSubscriptionResult,
} from "@/lib/billing/reclaim-result";

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

export async function reclaimSubscriptionForWorkspace(
  workspaceHeaders: { "X-Workspace-Id": string; "X-Workspace-Secret"?: string },
): Promise<ReclaimSubscriptionResult> {
  try {
    const result = await apiJson<{ reclaimed: boolean }>("/api/billing/reclaim", {
      method: "POST",
      workspaceHeaders,
    });
    return { reclaimed: result.reclaimed };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        reclaimed: false,
        error: {
          code: error.code ?? "reclaim_failed",
          message: getReclaimErrorMessage(
            error.code ?? "reclaim_failed",
            error.message,
          ),
        },
      };
    }

    return {
      reclaimed: false,
      error: {
        code: "reclaim_failed",
        message: "Could not restore your RagBase Pro subscription. Try again from Settings or contact support.",
      },
    };
  }
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
