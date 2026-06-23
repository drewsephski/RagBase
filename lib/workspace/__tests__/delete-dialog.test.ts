import { describe, expect, test } from "@jest/globals";
import {
  getWorkspaceDeleteDialogCopy,
  workspaceDeleteCancelSubscription,
  workspaceDeleteRequiresProCancellation,
} from "@/lib/workspace/delete-dialog";

describe("workspace delete dialog helpers", () => {
  test("shows Pro cancellation copy when workspace is Pro", () => {
    const copy = getWorkspaceDeleteDialogCopy({
      workspaceName: "Research",
      requiresProCancellation: true,
    });

    expect(copy.title).toBe("Delete Research?");
    expect(copy.description).toContain("RagBase Pro");
    expect(copy.helperText).toContain("Switch to another workspace");
    expect(copy.confirmLabel).toBe("Cancel Pro and delete");
  });

  test("shows standard delete copy for free workspaces", () => {
    const copy = getWorkspaceDeleteDialogCopy({
      workspaceName: "Notes",
      requiresProCancellation: false,
    });

    expect(copy.description).not.toContain("RagBase Pro");
    expect(copy.helperText).toBeNull();
    expect(copy.confirmLabel).toBe("Delete workspace");
  });

  test("requests subscription cancellation when Pro is active", () => {
    expect(
      workspaceDeleteCancelSubscription({
        isProActive: true,
        mustCancelSubscription: false,
      }),
    ).toBe(true);
  });

  test("requests subscription cancellation after a 409 response", () => {
    expect(
      workspaceDeleteRequiresProCancellation({
        isProActive: false,
        mustCancelSubscription: true,
      }),
    ).toBe(true);
  });
});
