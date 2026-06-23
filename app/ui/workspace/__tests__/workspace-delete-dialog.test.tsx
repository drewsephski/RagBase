import { describe, expect, test, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkspaceDeleteDialog } from "@/app/ui/workspace/workspace-delete-dialog";

describe("WorkspaceDeleteDialog", () => {
  test("shows Pro delete copy from Settings flow", () => {
    render(
      <WorkspaceDeleteDialog
        open
        onOpenChange={() => undefined}
        workspaceName="Research"
        isProActive
        mustCancelSubscription={false}
        isDeleting={false}
        error={null}
        onConfirm={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: "Delete Research?" })).toBeTruthy();
    expect(screen.getByText(/RagBase Pro/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel Pro and delete" })).toBeTruthy();
  });

  test("shows Pro delete copy from workspace switcher after 409", () => {
    render(
      <WorkspaceDeleteDialog
        open
        onOpenChange={() => undefined}
        workspaceName="Archive"
        isProActive={false}
        mustCancelSubscription
        isDeleting={false}
        error="Confirm cancellation to delete it, or manage billing first."
        onConfirm={() => undefined}
      />,
    );

    expect(screen.getByText(/RagBase Pro/i)).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "Confirm cancellation to delete it",
    );
    expect(screen.getByRole("button", { name: "Cancel Pro and delete" })).toBeTruthy();
  });

  test("calls confirm handler from Settings and switcher flows", () => {
    const onConfirm = jest.fn<() => void | Promise<void>>();

    render(
      <WorkspaceDeleteDialog
        open
        onOpenChange={() => undefined}
        workspaceName="Research"
        isProActive
        mustCancelSubscription={false}
        isDeleting={false}
        error={null}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel Pro and delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
