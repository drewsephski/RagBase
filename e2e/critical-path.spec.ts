import path from "path";
import { test, expect } from "@playwright/test";
import { clearWorkspaceStorage, waitForWorkspaceReady } from "./helpers/workspace";

const FIXTURE_PATH = path.join(__dirname, "fixtures", "sample.txt");

test.describe("Critical path", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await clearWorkspaceStorage(page);
    await page.goto("/");
    await waitForWorkspaceReady(page);
  });

  test("upload → ready → chat with citations → delete workspace", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await page.locator('input[type="file"]').setInputFiles(FIXTURE_PATH);

    await expect(page.getByText("RagBase").first()).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByLabel("Document: sample.txt")).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByLabel("Status: Ready")).toBeVisible({
      timeout: 120_000,
    });

    const chatInput = page.getByLabel("Ask a question");
    await chatInput.fill("What is the secret phrase in the test document?");
    await page.getByLabel("Send message").click();

    await expect(page.getByLabel("Assistant message")).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.getByLabel("Assistant message")).toContainText(
      /purple elephant forty-two/i,
      { timeout: 90_000 },
    );

    const citationButton = page.getByRole("button", { name: /View source 1:/ }).first();
    await expect(citationButton).toBeVisible({ timeout: 30_000 });
    await citationButton.click();

    await expect(page.getByRole("dialog", { name: "Source [1]" })).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Source [1]" }).getByText(/purple elephant forty-two/),
    ).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();

    await page.getByLabel("Open settings").click();
    await page.getByRole("button", { name: "Delete workspace" }).click();
    await page.getByRole("button", { name: "Delete everything" }).click();

    await expect(page.getByLabel("Public page URL")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByLabel("Upload a document")).toBeVisible();
    await expect(page.getByLabel("Ask a question")).toBeDisabled();
  });
});
