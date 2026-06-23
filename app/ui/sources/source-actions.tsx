"use client";

import type { Source, SourceStatus } from "@/lib/domain/definitions";
import { getStatusLabel } from "@/lib/sources/ingestion-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Focus, RefreshCw, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

interface SourceActionsProps {
  source: Source;
  isScoped: boolean;
  onToggleScope: () => void;
  onReprocess: () => Promise<void>;
  onDelete: () => Promise<void>;
  disabled?: boolean;
  showReprocess?: boolean;
}

function ActionTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function SourceActions({
  source,
  isScoped,
  onToggleScope,
  onReprocess,
  onDelete,
  disabled = false,
  showReprocess = true,
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

  const scopeTooltip = isScoped
    ? "Using this document only. Click to search all documents."
    : "Scope chat to this document only";

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex shrink-0 items-center gap-0.5">
        {canScope ? (
          <ActionTooltip label={scopeTooltip}>
            <Button
              type="button"
              variant={isScoped ? "default" : "ghost"}
              size="sm"
              disabled={disabled}
              onClick={onToggleScope}
              aria-pressed={isScoped}
              aria-label={scopeTooltip}
              className="h-6 gap-1 px-1.5 text-[10px] font-normal whitespace-nowrap"
            >
              <Focus className="size-2.5 shrink-0" aria-hidden />
              {isScoped ? "This doc" : "Scope"}
            </Button>
          </ActionTooltip>
        ) : null}

        {canReprocess && showReprocess ? (
          <ActionTooltip label="Re-read and re-index this document">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || isReprocessing}
              onClick={() => void handleReprocess()}
              aria-label={`Reindex ${source.name}`}
              className="h-6 gap-1 px-1.5 text-[10px] font-normal whitespace-nowrap"
            >
              <RefreshCw
                className={
                  isReprocessing ? "size-2.5 shrink-0 animate-spin" : "size-2.5 shrink-0"
                }
                aria-hidden
              />
              Reindex
            </Button>
          </ActionTooltip>
        ) : null}

        <ActionTooltip label="Delete this document">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || isDeleting}
            onClick={() => setShowDeleteDialog(true)}
            aria-label={`Delete ${source.name}`}
            className="text-destructive hover:text-destructive size-6 shrink-0"
          >
            <Trash2 className="size-2.5" aria-hidden />
          </Button>
        </ActionTooltip>
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

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
    </TooltipProvider>
  );
}

function getStatusBadgeVariant(
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

export function StatusBadge({
  source,
  status,
  className,
}: {
  source?: Source;
  status: SourceStatus;
  className?: string;
}) {
  const label = getStatusLabel(source ?? status);

  return (
    <Badge
      variant={getStatusBadgeVariant(status)}
      aria-label={`Status: ${label}`}
      className={className}
    >
      {label}
    </Badge>
  );
}
