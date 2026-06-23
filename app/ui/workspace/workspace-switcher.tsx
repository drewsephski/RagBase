"use client";

import { useCallback, useState } from "react";
import { Check, ChevronDown, FolderPlus, Pencil, Trash2 } from "lucide-react";
import {
  LIMITS,
  type CreateWorkspaceOptions,
  type StoredWorkspace,
} from "@/lib/domain/definitions";
import { getWorkspaceTemplate } from "@/lib/domain/templates";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  TemplateSelector,
  type TemplateSelectorValue,
} from "@/app/ui/workspace/template-selector";

export interface WorkspaceSwitcherProps {
  workspaces: StoredWorkspace[];
  activeWorkspace: StoredWorkspace | null;
  onSwitch: (id: string) => void;
  onCreate: (options?: CreateWorkspaceOptions) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  className?: string;
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
  className,
}: WorkspaceSwitcherProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateSelectorValue>("");
  const [targetWorkspace, setTargetWorkspace] = useState<StoredWorkspace | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreateMore = workspaces.length < LIMITS.MAX_WORKSPACES;
  const activeName = activeWorkspace?.name ?? "Workspace";

  // TODO(workspace-recovery): optional "Save recovery link" per workspace — docs/workspace-recovery.md

  const handleOpenCreate = useCallback(() => {
    setNameInput("");
    setSelectedTemplateId("");
    setError(null);
    setCreateOpen(true);
  }, []);

  const handleTemplateChange = useCallback(
    (nextTemplateId: TemplateSelectorValue) => {
      setSelectedTemplateId(nextTemplateId);

      if (nextTemplateId && nameInput.trim().length === 0) {
        setNameInput(getWorkspaceTemplate(nextTemplateId).workspaceName);
      }
    },
    [nameInput],
  );

  const handleOpenRename = useCallback((workspace: StoredWorkspace) => {
    setTargetWorkspace(workspace);
    setNameInput(workspace.name);
    setError(null);
    setRenameOpen(true);
  }, []);

  const handleOpenDelete = useCallback((workspace: StoredWorkspace) => {
    setTargetWorkspace(workspace);
    setError(null);
    setDeleteOpen(true);
  }, []);

  const handleCreate = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onCreate({
        name: nameInput.trim() || undefined,
        templateId: selectedTemplateId || undefined,
      });
      setCreateOpen(false);
      setNameInput("");
      setSelectedTemplateId("");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create workspace.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [nameInput, onCreate, selectedTemplateId]);

  const handleRename = useCallback(async () => {
    if (!targetWorkspace) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onRename(targetWorkspace.id, nameInput.trim());
      setRenameOpen(false);
      setTargetWorkspace(null);
      setNameInput("");
    } catch (renameError) {
      setError(
        renameError instanceof Error
          ? renameError.message
          : "Could not rename workspace.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [nameInput, onRename, targetWorkspace]);

  const handleDelete = useCallback(async () => {
    if (!targetWorkspace) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onDelete(targetWorkspace.id);
      setDeleteOpen(false);
      setTargetWorkspace(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete workspace.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [onDelete, targetWorkspace]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "surface-panel max-w-[10rem] justify-between gap-1 rounded-xl px-2 sm:max-w-[14rem]",
              className,
            )}
            aria-label={`Current workspace: ${activeName}. Switch workspace.`}
          >
            <span className="truncate">{activeName}</span>
            <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              className="flex items-center justify-between gap-2"
              onSelect={(event) => {
                event.preventDefault();
                onSwitch(workspace.id);
              }}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {activeWorkspace?.id === workspace.id ? (
                  <Check className="size-4 shrink-0" aria-hidden />
                ) : (
                  <span className="size-4 shrink-0" aria-hidden />
                )}
                <span className="truncate">{workspace.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  className="hover:bg-accent rounded p-1"
                  aria-label={`Rename ${workspace.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleOpenRename(workspace);
                  }}
                >
                  <Pencil className="size-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className="hover:bg-accent text-destructive rounded p-1"
                  aria-label={`Delete ${workspace.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleOpenDelete(workspace);
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </span>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            disabled={!canCreateMore}
            onSelect={(event) => {
              event.preventDefault();
              handleOpenCreate();
            }}
          >
            <FolderPlus aria-hidden />
            New workspace
            {!canCreateMore ? (
              <span className="text-muted-foreground ml-auto text-xs">
                Max {LIMITS.MAX_WORKSPACES}
              </span>
            ) : null}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>
              Create a separate space for another set of documents and chats.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="new-workspace-name">Name</Label>
            <Input
              id="new-workspace-name"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="e.g. Research papers"
              maxLength={64}
              aria-label="Workspace name"
            />
          </div>

          <TemplateSelector
            value={selectedTemplateId}
            onChange={handleTemplateChange}
            disabled={isSubmitting}
          />

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating…" : "Create workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename workspace</DialogTitle>
            <DialogDescription>
              Update how this workspace appears in the switcher.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="rename-workspace-name">Name</Label>
            <Input
              id="rename-workspace-name"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              maxLength={64}
              aria-label="Workspace name"
            />
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleRename()}
              disabled={isSubmitting || nameInput.trim().length === 0}
            >
              {isSubmitting ? "Saving…" : "Save name"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {targetWorkspace?.name}?</DialogTitle>
            <DialogDescription>
              All documents and messages in this workspace will be permanently
              removed from our servers. Other workspaces on this device are
              not affected.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting…" : "Delete workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
