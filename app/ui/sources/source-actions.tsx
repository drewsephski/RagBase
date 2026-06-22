"use client";

import type { Source, SourceStatus } from "@/app/lib/definitions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

interface SourceActionsProps {
  source: Source;
  isScoped: boolean;
  onToggleScope: () => void;
  onReprocess: () => Promise<void>;
  onDelete: () => Promise<void>;
  disabled?: boolean;
}

export function SourceActions({
  source,
  isScoped,
  onToggleScope,
  onReprocess,
  onDelete,
  disabled = false,
}: SourceActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const canScope = source.status === "ready";
  const canReprocess =
    source.status === "ready" || source.status === "error";

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await onDelete();
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleReprocess() {
    setIsReprocessing(true);
    try {
      await onReprocess();
    } finally {
      setIsReprocessing(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canScope ? (
          <Button
            type="button"
            variant={isScoped ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={onToggleScope}
            aria-pressed={isScoped}
            aria-label={
              isScoped
                ? `Asking only about ${source.name}. Click to ask about all documents.`
                : `Ask only about ${source.name}`
            }
          >
            {isScoped ? "This doc only" : "Ask this doc only"}
          </Button>
        ) : null}

        {canReprocess ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isReprocessing}
            onClick={() => void handleReprocess()}
            aria-label={`Re-read ${source.name}`}
          >
            <RefreshCw
              className={isReprocessing ? "animate-spin" : undefined}
              aria-hidden
            />
            Re-read
          </Button>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || isDeleting}
          onClick={() => setShowDeleteDialog(true)}
          aria-label={`Delete ${source.name}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 aria-hidden />
          Delete
        </Button>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this document?</DialogTitle>
            <DialogDescription>
              &ldquo;{source.name}&rdquo; and its chat history references will
              be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function getStatusBadgeVariant(
  status: SourceStatus,
): "secondary" | "warning" | "success" | "destructive" {
  switch (status) {
    case "ready":
      return "success";
    case "error":
      return "destructive";
    case "processing":
      return "warning";
    default:
      return "secondary";
  }
}

export function getStatusLabel(status: SourceStatus): string {
  switch (status) {
    case "pending":
      return "Waiting";
    case "processing":
      return "Reading";
    case "ready":
      return "Ready";
    case "error":
      return "Problem";
    default:
      return status;
  }
}

export function StatusBadge({ status }: { status: SourceStatus }) {
  return (
    <Badge variant={getStatusBadgeVariant(status)} aria-label={`Status: ${getStatusLabel(status)}`}>
      {getStatusLabel(status)}
    </Badge>
  );
}
