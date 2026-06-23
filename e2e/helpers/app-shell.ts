import path from "path";
import type { Page } from "@playwright/test";

const FIXTURE_PATH = path.join(__dirname, "..", "fixtures", "sample.txt");

export async function openAppShell(page: Page): Promise<void> {
  await page.locator('input[type="file"]').setInputFiles(FIXTURE_PATH);
  await page.getByLabel("Open settings").waitFor({ timeout: 60_000 });
}

export const PRO_SUBSCRIPTION_FIXTURE = {
  plan: "pro",
  isProActive: true,
  stripeSubscriptionStatus: "active",
  currentPeriodEnd: "2026-07-01T00:00:00.000Z",
  hasStripeCustomer: true,
  recoveryLinkConfirmed: false,
  crawlQuota: {
    crawlsUsed: 0,
    crawlsLimit: 10,
    pagesUsed: 0,
    pagesLimit: 1000,
  },
} as const;

export const FREE_SUBSCRIPTION_FIXTURE = {
  plan: "anonymous",
  isProActive: false,
  stripeSubscriptionStatus: null,
  currentPeriodEnd: null,
  hasStripeCustomer: false,
  recoveryLinkConfirmed: false,
} as const;

export async function mockSubscription(
  page: Page,
  subscription: typeof PRO_SUBSCRIPTION_FIXTURE | typeof FREE_SUBSCRIPTION_FIXTURE,
): Promise<void> {
  await page.route("**/api/workspaces/subscription", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(subscription),
    });
  });
}

export async function prepareProAppShell(page: Page): Promise<void> {
  await mockSubscription(page, PRO_SUBSCRIPTION_FIXTURE);
  await page.reload();
  await page.getByLabel("Public page URL").waitFor({ timeout: 60_000 });

  const hasAppShell = await page
    .getByLabel("Open settings")
    .isVisible()
    .catch(() => false);

  if (!hasAppShell) {
    await openAppShell(page);
  }

  await page.getByLabel("RagBase Pro workspace").waitFor({ timeout: 30_000 });
}

export async function readWorkspaceAuthFromPage(page: Page): Promise<{
  workspaceId: string;
  workspaceSecret: string | null;
}> {
  const auth = await page.evaluate(() => {
    const registryRaw = localStorage.getItem("ragbase_workspace_registry");
    const activeId = localStorage.getItem("ragbase_active_workspace_id");
    const registry = registryRaw ? (JSON.parse(registryRaw) as Array<{ id: string; secret?: string }>) : [];
    const workspace =
      registry.find((entry) => entry.id === activeId) ?? registry[0] ?? null;

    if (!workspace) {
      return null;
    }

    return {
      workspaceId: workspace.id,
      workspaceSecret: workspace.secret ?? null,
    };
  });

  if (!auth?.workspaceId) {
    throw new Error("Could not read workspace auth from browser storage.");
  }

  return auth;
}
