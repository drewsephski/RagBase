import { describe, expect, test, beforeEach } from "@jest/globals";
import { DEFAULT_WORKSPACE_NAME, LIMITS } from "@/lib/domain/definitions";
import {
  ACTIVE_WORKSPACE_ID_KEY,
  WORKSPACE_ID_KEY,
  WORKSPACE_REGISTRY_KEY,
  WORKSPACE_SECRET_KEY,
} from "@/lib/workspace/keys";
import {
  addWorkspace,
  createStoredWorkspace,
  getActiveWorkspace,
  getActiveWorkspaceId,
  loadRegistry,
  removeWorkspace,
  renameWorkspaceLocal,
  setActiveWorkspace,
  WorkspaceRegistryError,
} from "@/lib/workspace/registry";

function createMockStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

const LEGACY_ID = "11111111-1111-4111-8111-111111111111";
const LEGACY_SECRET = "a".repeat(64);
const WORKSPACE_A = createStoredWorkspace(
  "22222222-2222-4222-8222-222222222222",
  "b".repeat(64),
  "Research",
);
const WORKSPACE_B = createStoredWorkspace(
  "33333333-3333-4333-8333-333333333333",
  "c".repeat(64),
  "Contracts",
);

describe("workspace registry", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMockStorage();
  });

  test("migrates legacy localStorage keys into the registry", () => {
    storage.setItem(WORKSPACE_ID_KEY, LEGACY_ID);
    storage.setItem(WORKSPACE_SECRET_KEY, LEGACY_SECRET);

    const workspaces = loadRegistry(storage);

    expect(workspaces).toHaveLength(1);
    expect(workspaces[0]).toMatchObject({
      id: LEGACY_ID,
      secret: LEGACY_SECRET,
      name: DEFAULT_WORKSPACE_NAME,
    });
    expect(storage.getItem(WORKSPACE_ID_KEY)).toBeNull();
    expect(storage.getItem(WORKSPACE_SECRET_KEY)).toBeNull();
    expect(storage.getItem(WORKSPACE_REGISTRY_KEY)).not.toBeNull();
  });

  test("selects the active workspace and falls back to the first entry", () => {
    addWorkspace(WORKSPACE_A, storage);
    addWorkspace(WORKSPACE_B, storage);

    expect(getActiveWorkspaceId(storage)).toBe(WORKSPACE_B.id);

    setActiveWorkspace(WORKSPACE_A.id, storage);
    expect(getActiveWorkspace(storage)?.id).toBe(WORKSPACE_A.id);
  });

  test("sets the first registry entry active when active id is missing", () => {
    storage.setItem(WORKSPACE_REGISTRY_KEY, JSON.stringify([WORKSPACE_A, WORKSPACE_B]));
    storage.removeItem(ACTIVE_WORKSPACE_ID_KEY);

    expect(getActiveWorkspaceId(storage)).toBe(WORKSPACE_A.id);
  });

  test("enforces the max workspace cap", () => {
    for (let index = 0; index < LIMITS.MAX_WORKSPACES; index += 1) {
      const id = `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
      addWorkspace(
        createStoredWorkspace(id, "b".repeat(64), `Workspace ${index}`),
        storage,
      );
    }

    expect(() =>
      addWorkspace(
        createStoredWorkspace(
          "99999999-9999-4999-8999-999999999999",
          "d".repeat(64),
          "Overflow",
        ),
        storage,
      ),
    ).toThrow(WorkspaceRegistryError);
  });

  test("removing the active workspace selects the next available entry", () => {
    addWorkspace(WORKSPACE_A, storage);
    addWorkspace(WORKSPACE_B, storage);

    const { nextActiveId, workspaces } = removeWorkspace(WORKSPACE_B.id, storage);

    expect(workspaces).toHaveLength(1);
    expect(nextActiveId).toBe(WORKSPACE_A.id);
    expect(getActiveWorkspace(storage)?.id).toBe(WORKSPACE_A.id);
  });

  test("renames a workspace locally", () => {
    addWorkspace(WORKSPACE_A, storage);

    renameWorkspaceLocal(WORKSPACE_A.id, "Updated name", storage);

    expect(getActiveWorkspace(storage)?.name).toBe("Updated name");
  });
});
