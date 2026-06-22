import { test, expect } from "@playwright/test";
import { clearWorkspaceStorage, waitForWorkspaceReady } from "./helpers/workspace";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await clearWorkspaceStorage(page);
    await page.goto("/");
    await waitForWorkspaceReady(page);
  });

  test("renders URL input, file input, disabled chat, and RagBase branding", async ({
    page,
  }) => {
    await expect(page.getByText("RagBase").first()).toBeVisible();
    await expect(page.getByLabel("Public page URL")).toBeVisible();
    await expect(page.getByLabel("Upload a document")).toBeVisible();
    await expect(page.getByLabel("Ask a question")).toBeDisabled();
    await expect(page.getByLabel("Ask a question")).toHaveAttribute(
      "placeholder",
      /Add a link or file to start asking questions/i,
    );
  });

  test("does not show developer jargon in UI copy", async ({ page }) => {
    const bodyText = await page.locator("body").innerText();

    expect(bodyText).not.toMatch(/\bembeddings\b/i);
    expect(bodyText).not.toMatch(/\bvectors\b/i);
    expect(bodyText).not.toMatch(/\bchunks\b/i);
    expect(bodyText).not.toMatch(/\brag\b/i);
  });

  test("creates anonymous workspace in localStorage", async ({ page }) => {
    const workspaceId = await page.evaluate(() =>
      localStorage.getItem("ragbase_workspace_id"),
    );
    const workspaceSecret = await page.evaluate(() =>
      localStorage.getItem("ragbase_workspace_secret"),
    );

    expect(workspaceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(workspaceSecret?.length).toBeGreaterThanOrEqual(32);
  });
});
