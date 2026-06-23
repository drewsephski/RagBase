"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getWorkspaceDeleteDialogCopy,
  workspaceDeleteRequiresProCancellation,
} from "@/lib/workspace/delete-dialog";

interface WorkspaceDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceName: string;
  isProActive?: boolean;
  mustCancelSubscription: boolean;
  isDeleting: boolean;
  error: string | null;
  onConfirm: () => void | Promise<void>;
}

export function WorkspaceDeleteDialog({
  open,
  onOpenChange,
  workspaceName,
  isProActive = false,
  mustCancelSubscription,
  isDeleting,
  error,
  onConfirm,
}: WorkspaceDeleteDialogProps) {
  const requiresProCancellation = workspaceDeleteRequiresProCancellation({
    isProActive,
    mustCancelSubscription,
  });

  const copy = getWorkspaceDeleteDialogCopy({
    workspaceName,
    requiresProCancellation,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {copy.helperText ? (
          <p className="text-muted-foreground text-sm leading-relaxed">{copy.helperText}</p>
        ) : null}

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter className="gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={isDeleting}
          >
            {isDeleting ? copy.deletingLabel : copy.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
