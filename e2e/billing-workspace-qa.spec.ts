import { test, expect } from "@playwright/test";
import { clearWorkspaceStorage, waitForWorkspaceReady } from "./helpers/workspace";
import {
  FREE_SUBSCRIPTION_FIXTURE,
  mockSubscription,
  openAppShell,
  prepareProAppShell,
} from "./helpers/app-shell";

test.describe("Billing & workspace UX QA", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await clearWorkspaceStorage(page);
    await page.goto("/app");
    await waitForWorkspaceReady(page);
  });

  test("free workspace delete from Settings uses unified dialog copy", async ({ page }) => {
    await mockSubscription(page, FREE_SUBSCRIPTION_FIXTURE);
    await openAppShell(page);

    await page.getByLabel("Open settings").click();
    await page.getByRole("button", { name: "Delete current workspace" }).click();

    await expect(page.getByRole("heading", { name: /Delete .+\?/ })).toBeVisible();
    await expect(page.getByText(/permanently removed from our servers/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete workspace" })).toBeVisible();

    await page.getByRole("button", { name: "Delete workspace" }).click();

    await expect(page.getByLabel("Public page URL")).toBeVisible({ timeout: 30_000 });
  });

  test("Pro delete from Settings shows Pro-aware copy on first open", async ({ page }) => {
    await openAppShell(page);
    await prepareProAppShell(page);

    await page.getByLabel("Open settings").click();
    await page.getByRole("button", { name: "Delete current workspace" }).click();

    const deleteDialog = page.getByRole("dialog");
    await expect(deleteDialog.getByText(/This workspace has RagBase Pro/i)).toBeVisible();
    await expect(
      deleteDialog.getByRole("button", { name: "Cancel Pro and delete" }),
    ).toBeVisible();
    await expect(deleteDialog.getByText(/Switch to another workspace first/i)).toBeVisible();

    await deleteDialog.getByRole("button", { name: "Cancel", exact: true }).click();
  });

  test("Pro delete from workspace switcher matches Settings copy", async ({ page }) => {
    await openAppShell(page);
    await prepareProAppShell(page);

    await page.getByLabel(/Current workspace:/).click();
    await page.getByLabel(/Delete /).first().click();

    const deleteDialog = page.getByRole("dialog");
    await expect(deleteDialog.getByText(/This workspace has RagBase Pro/i)).toBeVisible();
    await expect(
      deleteDialog.getByRole("button", { name: "Cancel Pro and delete" }),
    ).toBeVisible();

    await deleteDialog.getByRole("button", { name: "Cancel", exact: true }).click();
  });

  test("Pro badge appears in switcher and nav when subscription is Pro", async ({ page }) => {
    await openAppShell(page);
    await prepareProAppShell(page);

    await expect(page.getByLabel("RagBase Pro workspace")).toBeVisible();
    await expect(page.getByLabel("Manage RagBase Pro billing")).toBeVisible();
  });

  test("Settings billing section shows plan and manage billing for Pro", async ({ page }) => {
    await openAppShell(page);
    await prepareProAppShell(page);

    await page.getByLabel("Open settings").click();
    const billing = page.getByRole("region", { name: "Billing" });
    await expect(billing).toBeVisible();
    await expect(billing.getByText("RagBase Pro")).toBeVisible();
    await expect(billing.getByRole("button", { name: "Manage billing" })).toBeVisible();
  });

  test("Stripe portal opens from Pro nav badge", async ({ page }) => {
    await openAppShell(page);
    await prepareProAppShell(page);

    let portalRequested = false;
    await page.route("**/api/billing/portal", async (route) => {
      portalRequested = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://billing.stripe.com/p/session/test_qa" }),
      });
    });

    await page.getByLabel("Manage RagBase Pro billing").click();
    await expect.poll(() => portalRequested).toBe(true);
    await page.waitForURL("https://billing.stripe.com/p/session/test_qa", {
      timeout: 10_000,
    });
  });

  test("recovery banner can appear without blocking billing UI", async ({ page }) => {
    await mockSubscription(page, FREE_SUBSCRIPTION_FIXTURE);
    await openAppShell(page);

    await page.getByLabel("Ask a question").fill("Hello");
    await page.getByLabel("Send message").click();

    const recoveryBanner = page.getByRole("status").filter({
      hasText: /Save a recovery link/i,
    });
    await expect(recoveryBanner).toBeVisible({ timeout: 90_000 });

    await page.getByLabel("Open settings").click();
    await expect(page.getByRole("region", { name: "Billing" })).toBeVisible();
  });
});

test.describe("Reclaim API QA", () => {
  test("reclaim rate limit returns friendly 429", async ({ request }) => {
    const createResponse = await request.post("/api/workspaces", {
      data: { name: "Reclaim QA" },
    });
    expect(createResponse.ok()).toBeTruthy();

    const created = (await createResponse.json()) as {
      workspaceId: string;
      workspaceSecret: string;
    };

    const headers = {
      "X-Workspace-Id": created.workspaceId,
      "X-Workspace-Secret": created.workspaceSecret,
      "Content-Type": "application/json",
    };

    const probe = await request.post("/api/billing/reclaim", { headers });
    if (probe.status() === 503) {
      test.skip(true, "Billing is not enabled in this environment.");
    }

    let saw429 = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await request.post("/api/billing/reclaim", { headers });
      if (response.status() === 429) {
        saw429 = true;
        const body = (await response.json()) as { error?: string; code?: string };
        expect(body.code).toBe("rate_limit");
        expect(body.error).toMatch(/Pro subscription restore attempts/i);
        break;
      }
    }

    expect(saw429).toBe(true);
  });
});
