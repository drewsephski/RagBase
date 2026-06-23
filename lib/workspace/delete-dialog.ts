export interface WorkspaceDeleteDialogCopy {
  title: string;
  description: string;
  helperText: string | null;
  confirmLabel: string;
  deletingLabel: string;
}

export function getWorkspaceDeleteDialogCopy(options: {
  workspaceName: string;
  requiresProCancellation: boolean;
}): WorkspaceDeleteDialogCopy {
  const { workspaceName, requiresProCancellation } = options;
  const name = workspaceName.trim() || "this workspace";

  return {
    title: `Delete ${name}?`,
    description: requiresProCancellation
      ? "This workspace has RagBase Pro. Deleting it cancels your subscription immediately and permanently removes all documents and messages."
      : "All documents and messages in this workspace will be permanently removed from our servers. Your other workspaces on this device are not affected.",
    helperText: requiresProCancellation
      ? "Switch to another workspace first if you want to keep Pro access there, or use Manage billing before deleting."
      : null,
    confirmLabel: requiresProCancellation ? "Cancel Pro and delete" : "Delete workspace",
    deletingLabel: "Deleting…",
  };
}

export function workspaceDeleteRequiresProCancellation(options: {
  isProActive: boolean;
  mustCancelSubscription: boolean;
}): boolean {
  return options.mustCancelSubscription || options.isProActive;
}

export function workspaceDeleteCancelSubscription(options: {
  isProActive: boolean;
  mustCancelSubscription: boolean;
}): boolean {
  return workspaceDeleteRequiresProCancellation(options);
}
