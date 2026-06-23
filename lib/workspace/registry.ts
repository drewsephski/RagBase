import {
  DEFAULT_WORKSPACE_NAME,
  LIMITS,
  storedWorkspaceSchema,
  type StoredWorkspace,
} from "@/lib/domain/definitions";
import {
  ACTIVE_WORKSPACE_ID_KEY,
  WORKSPACE_ID_KEY,
  WORKSPACE_REGISTRY_KEY,
  WORKSPACE_SECRET_KEY,
} from "@/lib/workspace/keys";

export class WorkspaceRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceRegistryError";
  }
}

function parseRegistry(raw: string | null): StoredWorkspace[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry) => {
      const result = storedWorkspaceSchema.safeParse(entry);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

function readRegistryFromStorage(storage: Storage): StoredWorkspace[] {
  return parseRegistry(storage.getItem(WORKSPACE_REGISTRY_KEY));
}

function writeRegistryToStorage(
  storage: Storage,
  workspaces: StoredWorkspace[],
): void {
  storage.setItem(WORKSPACE_REGISTRY_KEY, JSON.stringify(workspaces));
}

function readActiveIdFromStorage(storage: Storage): string | null {
  return storage.getItem(ACTIVE_WORKSPACE_ID_KEY);
}

function writeActiveIdToStorage(storage: Storage, id: string): void {
  storage.setItem(ACTIVE_WORKSPACE_ID_KEY, id);
}

function clearActiveIdFromStorage(storage: Storage): void {
  storage.removeItem(ACTIVE_WORKSPACE_ID_KEY);
}

function migrateLegacyKeys(storage: Storage): StoredWorkspace[] {
  const legacyId = storage.getItem(WORKSPACE_ID_KEY);
  const legacySecret = storage.getItem(WORKSPACE_SECRET_KEY);

  if (!legacyId || !legacySecret) {
    return [];
  }

  const migrated: StoredWorkspace = {
    id: legacyId,
    secret: legacySecret,
    name: DEFAULT_WORKSPACE_NAME,
    createdAt: new Date().toISOString(),
  };

  storage.removeItem(WORKSPACE_ID_KEY);
  storage.removeItem(WORKSPACE_SECRET_KEY);

  return [migrated];
}

export function loadRegistry(storage: Storage = localStorage): StoredWorkspace[] {
  let workspaces = readRegistryFromStorage(storage);

  if (workspaces.length === 0) {
    workspaces = migrateLegacyKeys(storage);
    if (workspaces.length > 0) {
      writeRegistryToStorage(storage, workspaces);
    }
  }

  return workspaces;
}

export function getActiveWorkspaceId(
  storage: Storage = localStorage,
): string | null {
  const activeId = readActiveIdFromStorage(storage);
  const workspaces = loadRegistry(storage);

  if (activeId && workspaces.some((workspace) => workspace.id === activeId)) {
    return activeId;
  }

  if (workspaces.length > 0) {
    const firstWorkspace = workspaces[0];
    if (firstWorkspace) {
      writeActiveIdToStorage(storage, firstWorkspace.id);
      return firstWorkspace.id;
    }
  }

  return null;
}

export function getActiveWorkspace(
  storage: Storage = localStorage,
): StoredWorkspace | null {
  const activeId = getActiveWorkspaceId(storage);
  if (!activeId) {
    return null;
  }

  return loadRegistry(storage).find((workspace) => workspace.id === activeId) ?? null;
}

export function setActiveWorkspace(
  id: string,
  storage: Storage = localStorage,
): StoredWorkspace {
  const workspaces = loadRegistry(storage);
  const workspace = workspaces.find((entry) => entry.id === id);

  if (!workspace) {
    throw new WorkspaceRegistryError("Workspace not found in registry.");
  }

  writeActiveIdToStorage(storage, id);
  return workspace;
}

export function addWorkspace(
  workspace: StoredWorkspace,
  storage: Storage = localStorage,
): StoredWorkspace[] {
  const workspaces = loadRegistry(storage);

  if (workspaces.some((entry) => entry.id === workspace.id)) {
    throw new WorkspaceRegistryError("Workspace already exists in registry.");
  }

  if (workspaces.length >= LIMITS.MAX_WORKSPACES) {
    throw new WorkspaceRegistryError(
      `You can have at most ${LIMITS.MAX_WORKSPACES} workspaces.`,
    );
  }

  const next = [...workspaces, workspace];
  writeRegistryToStorage(storage, next);
  writeActiveIdToStorage(storage, workspace.id);
  return next;
}

export function removeWorkspace(
  id: string,
  storage: Storage = localStorage,
): { workspaces: StoredWorkspace[]; nextActiveId: string | null } {
  const workspaces = loadRegistry(storage);
  const next = workspaces.filter((workspace) => workspace.id !== id);
  writeRegistryToStorage(storage, next);

  const activeId = readActiveIdFromStorage(storage);
  let nextActiveId: string | null = null;

  if (activeId === id) {
    nextActiveId = next[0]?.id ?? null;
    if (nextActiveId) {
      writeActiveIdToStorage(storage, nextActiveId);
    } else {
      clearActiveIdFromStorage(storage);
    }
  } else {
    nextActiveId = activeId;
  }

  return { workspaces: next, nextActiveId };
}

export function renameWorkspaceLocal(
  id: string,
  name: string,
  storage: Storage = localStorage,
): StoredWorkspace[] {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 64) {
    throw new WorkspaceRegistryError("Workspace name must be 1–64 characters.");
  }

  const workspaces = loadRegistry(storage);
  const next = workspaces.map((workspace) =>
    workspace.id === id ? { ...workspace, name: trimmed } : workspace,
  );

  if (!next.some((workspace) => workspace.id === id)) {
    throw new WorkspaceRegistryError("Workspace not found in registry.");
  }

  writeRegistryToStorage(storage, next);
  return next;
}

export const WORKSPACE_REGISTRY_UPDATED_EVENT = "ragbase-workspace-registry-updated";

export function notifyWorkspaceRegistryUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WORKSPACE_REGISTRY_UPDATED_EVENT));
  }
}

export function markWorkspaceAccountLinkedLocal(
  id: string,
  storage: Storage = localStorage,
): StoredWorkspace[] {
  const workspaces = loadRegistry(storage);
  const next = workspaces.map((workspace) => {
    if (workspace.id !== id) {
      return workspace;
    }

    return {
      id: workspace.id,
      name: workspace.name,
      createdAt: workspace.createdAt,
      accountLinked: true,
      ...(workspace.templateId ? { templateId: workspace.templateId } : {}),
    };
  });

  if (!next.some((workspace) => workspace.id === id)) {
    throw new WorkspaceRegistryError("Workspace not found in registry.");
  }

  writeRegistryToStorage(storage, next);
  notifyWorkspaceRegistryUpdated();
  return next;
}

export function createStoredWorkspace(
  id: string,
  secret: string,
  name?: string,
  templateId?: StoredWorkspace["templateId"],
): StoredWorkspace {
  const trimmed = name?.trim();
  return {
    id,
    secret,
    name: trimmed && trimmed.length > 0 ? trimmed.slice(0, 64) : DEFAULT_WORKSPACE_NAME,
    createdAt: new Date().toISOString(),
    ...(templateId ? { templateId } : {}),
  };
}

export function restoreWorkspaceFromRecovery(
  id: string,
  secret: string,
  storage: Storage = localStorage,
): StoredWorkspace {
  const workspaces = loadRegistry(storage);
  const existing = workspaces.find((workspace) => workspace.id === id);

  if (existing) {
    const next = workspaces.map((workspace) =>
      workspace.id === id ? { ...workspace, secret } : workspace,
    );
    writeRegistryToStorage(storage, next);
    writeActiveIdToStorage(storage, id);
    const restored = next.find((workspace) => workspace.id === id);
    if (!restored) {
      throw new WorkspaceRegistryError("Workspace not found in registry.");
    }
    return restored;
  }

  const workspace = createStoredWorkspace(id, secret);
  addWorkspace(workspace, storage);
  return workspace;
}
