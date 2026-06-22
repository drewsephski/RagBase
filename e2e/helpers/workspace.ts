import type { Page } from "@playwright/test";

export const WORKSPACE_ID_KEY = "ragbase_workspace_id";
export const WORKSPACE_SECRET_KEY = "ragbase_workspace_secret";
export const WORKSPACE_REGISTRY_KEY = "ragbase_workspace_registry";
export const ACTIVE_WORKSPACE_ID_KEY = "ragbase_active_workspace_id";

export async function clearWorkspaceStorage(page: Page): Promise<void> {
  await page.addInitScript(
    ([idKey, secretKey, registryKey, activeKey]) => {
      localStorage.removeItem(idKey);
      localStorage.removeItem(secretKey);
      localStorage.removeItem(registryKey);
      localStorage.removeItem(activeKey);
      localStorage.removeItem("ragbase_openrouter_key");
      localStorage.removeItem("ragbase_selected_model");
    },
    [
      WORKSPACE_ID_KEY,
      WORKSPACE_SECRET_KEY,
      WORKSPACE_REGISTRY_KEY,
      ACTIVE_WORKSPACE_ID_KEY,
    ] as const,
  );
}

export async function waitForWorkspaceReady(page: Page): Promise<void> {
  await page.getByLabel("Public page URL").waitFor({
    timeout: 30_000,
  });
}
