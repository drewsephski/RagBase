"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_WORKSPACE_NAME,
  type CreateWorkspaceOptions,
  type StoredWorkspace,
} from "@/lib/domain/definitions";
import { getWorkspaceTemplate } from "@/lib/domain/templates";
import { writeTemplateWorkspaceId } from "@/lib/templates/keys";
import { apiFetch, apiJson } from "@/lib/api/client";
import type { WorkspaceHeaders } from "@/lib/api/types";
import { trackEvent } from "@/lib/analytics/track";
import { syncAccountWorkspacesToRegistry } from "@/lib/workspace/account-sync";
import {
  addWorkspace,
  createStoredWorkspace,
  getActiveWorkspace,
  loadRegistry,
  removeWorkspace,
  renameWorkspaceLocal,
  setActiveWorkspace,
  WorkspaceRegistryError,
} from "@/lib/workspace/registry";

export type { WorkspaceHeaders } from "@/lib/api/types";

interface CreateWorkspaceResponse {
  workspaceId: string;
  workspaceSecret: string;
}

export interface UseWorkspacesState {
  workspaces: StoredWorkspace[];
  activeWorkspace: StoredWorkspace | null;
  headers: WorkspaceHeaders | null;
  isReady: boolean;
  error: string | null;
  switchWorkspace: (id: string) => void;
  createWorkspace: (options?: CreateWorkspaceOptions) => Promise<void>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  refreshRegistry: () => void;
  syncAccountWorkspaces: () => Promise<void>;
}

async function createWorkspaceOnServer(name?: string): Promise<CreateWorkspaceResponse> {
  const response = await fetch("/api/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(name ? { name } : {}),
  });

  if (!response.ok) {
    throw new Error("Could not create workspace.");
  }

  return (await response.json()) as CreateWorkspaceResponse;
}

function headersFromWorkspace(
  workspace: StoredWorkspace | null,
): WorkspaceHeaders | null {
  if (!workspace) {
    return null;
  }

  const headers: WorkspaceHeaders = {
    "X-Workspace-Id": workspace.id,
  };

  if (workspace.secret) {
    headers["X-Workspace-Secret"] = workspace.secret;
  }

  return headers;
}

export function useWorkspaces(): UseWorkspacesState {
  const [workspaces, setWorkspaces] = useState<StoredWorkspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<StoredWorkspace | null>(
    null,
  );
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncFromStorage = useCallback(() => {
    const registry = loadRegistry();
    const active = getActiveWorkspace();
    setWorkspaces(registry);
    setActiveWorkspaceState(active);
    return { registry, active };
  }, []);

  const refreshRegistry = useCallback(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  const syncAccountWorkspaces = useCallback(async () => {
    await syncAccountWorkspacesToRegistry();
    const { registry, active } = syncFromStorage();
    setWorkspaces(registry);
    setActiveWorkspaceState(active);
  }, [syncFromStorage]);

  useEffect(() => {
    let cancelled = false;

    async function initWorkspaces() {
      try {
        let { registry, active } = syncFromStorage();

        if (registry.length === 0) {
          const data = await createWorkspaceOnServer(DEFAULT_WORKSPACE_NAME);
          const stored = createStoredWorkspace(
            data.workspaceId,
            data.workspaceSecret,
            DEFAULT_WORKSPACE_NAME,
          );
          addWorkspace(stored);
          trackEvent("workspace_created", { trigger: "first_visit" });
          ({ registry, active } = syncFromStorage());
        }

        if (!cancelled) {
          setWorkspaces(registry);
          setActiveWorkspaceState(active);
          setIsReady(true);
        }
      } catch (initError) {
        if (!cancelled) {
          setError(
            initError instanceof Error
              ? initError.message
              : "Could not start your private workspace.",
          );
          setIsReady(true);
        }
      }
    }

    void initWorkspaces();

    return () => {
      cancelled = true;
    };
  }, [syncFromStorage]);

  const switchWorkspace = useCallback(
    (id: string) => {
      try {
        const workspace = setActiveWorkspace(id);
        setActiveWorkspaceState(workspace);
        setWorkspaces(loadRegistry());
      } catch (switchError) {
        setError(
          switchError instanceof Error
            ? switchError.message
            : "Could not switch workspace.",
        );
      }
    },
    [],
  );

  const createWorkspace = useCallback(
    async (options?: CreateWorkspaceOptions) => {
      try {
        const template = options?.templateId
          ? getWorkspaceTemplate(options.templateId)
          : null;
        const name =
          options?.name?.trim() ||
          template?.workspaceName ||
          undefined;
        const data = await createWorkspaceOnServer(name);
        const stored = createStoredWorkspace(
          data.workspaceId,
          data.workspaceSecret,
          name,
          options?.templateId,
        );
        if (options?.templateId) {
          writeTemplateWorkspaceId(options.templateId, stored.id);
        }
        const next = addWorkspace(stored);
        setWorkspaces(next);
        setActiveWorkspaceState(stored);
        setError(null);
        trackEvent("workspace_created", {
          trigger: options?.templateId ? "template" : "manual",
        });
      } catch (createError) {
        const message =
          createError instanceof WorkspaceRegistryError
            ? createError.message
            : createError instanceof Error
              ? createError.message
              : "Could not create workspace.";
        throw new Error(message);
      }
    },
    [],
  );

  const renameWorkspace = useCallback(
    async (id: string, name: string) => {
      const workspace = workspaces.find((entry) => entry.id === id);
      if (!workspace) {
        throw new Error("Workspace not found.");
      }

      const headers = headersFromWorkspace(workspace);
      if (!headers) {
        throw new Error("Workspace credentials missing.");
      }

      renameWorkspaceLocal(id, name);
      setWorkspaces(loadRegistry());
      if (activeWorkspace?.id === id) {
        setActiveWorkspaceState(getActiveWorkspace());
      }

      try {
        await apiJson("/api/workspaces", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
          workspaceHeaders: headers,
        });
      } catch {
        renameWorkspaceLocal(id, workspace.name);
        setWorkspaces(loadRegistry());
        if (activeWorkspace?.id === id) {
          setActiveWorkspaceState(getActiveWorkspace());
        }
        throw new Error("Could not rename workspace.");
      }
    },
    [activeWorkspace?.id, workspaces],
  );

  const deleteWorkspace = useCallback(
    async (id: string) => {
      const workspace = workspaces.find((entry) => entry.id === id);
      if (!workspace) {
        throw new Error("Workspace not found.");
      }

      const headers = headersFromWorkspace(workspace);
      if (headers) {
        const response = await apiFetch("/api/workspaces/delete", {
          method: "DELETE",
          workspaceHeaders: headers,
        });

        if (!response.ok && response.status !== 401) {
          throw new Error("Could not delete workspace.");
        }
      }

      trackEvent("workspace_deleted");

      const { workspaces: next, nextActiveId } = removeWorkspace(id);
      setWorkspaces(next);

      if (nextActiveId) {
        setActiveWorkspaceState(getActiveWorkspace());
        setError(null);
        return;
      }

      const data = await createWorkspaceOnServer(DEFAULT_WORKSPACE_NAME);
      const stored = createStoredWorkspace(
        data.workspaceId,
        data.workspaceSecret,
        DEFAULT_WORKSPACE_NAME,
      );
      const created = addWorkspace(stored);
      setWorkspaces(created);
      setActiveWorkspaceState(stored);
      setError(null);
    },
    [workspaces],
  );

  const headers = useMemo(
    () => headersFromWorkspace(activeWorkspace),
    [activeWorkspace],
  );

  return {
    workspaces,
    activeWorkspace,
    headers,
    isReady,
    error,
    switchWorkspace,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    refreshRegistry,
    syncAccountWorkspaces,
  };
}
