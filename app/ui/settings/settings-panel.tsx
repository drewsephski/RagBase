"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, KeyRound, Trash2 } from "lucide-react";
import { DEFAULT_MODEL, LIMITS } from "@/app/lib/definitions";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import {
  clearOpenRouterKey,
  getOpenRouterKey,
  getSelectedModel,
  hasOpenRouterKey,
  setOpenRouterKey,
  setSelectedModel,
} from "@/lib/openrouter/client-key";
import { apiFetch } from "@/lib/api/client";
import { trackEvent } from "@/lib/analytics/track";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MODEL_OPTIONS = [
  { value: DEFAULT_MODEL, label: "Gemini 2.5 Flash (default)" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
] as const;

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceHeaders: WorkspaceHeaders | null;
  activeWorkspaceName?: string;
  onRenameWorkspace?: (name: string) => Promise<void>;
  onWorkspaceDeleted?: () => void;
}

export function SettingsPanel({
  open,
  onOpenChange,
  workspaceHeaders,
  activeWorkspaceName,
  onRenameWorkspace,
  onWorkspaceDeleted,
}: SettingsPanelProps) {
  const [openRouterKeyInput, setOpenRouterKeyInput] = useState("");
  const [selectedModel, setSelectedModelState] = useState(DEFAULT_MODEL);
  const [hasKey, setHasKey] = useState(false);
  const [workspaceNameInput, setWorkspaceNameInput] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setOpenRouterKeyInput(getOpenRouterKey() ?? "");
    setSelectedModelState(getSelectedModel());
    setHasKey(hasOpenRouterKey());
    setWorkspaceNameInput(activeWorkspaceName ?? "");
    setSavedMessage(null);
    setRenameError(null);
  }, [activeWorkspaceName, open]);

  const handleSaveKey = useCallback(() => {
    const trimmed = openRouterKeyInput.trim();

    if (!trimmed) {
      clearOpenRouterKey();
      setHasKey(false);
      setSavedMessage("Key removed. Using the built-in model.");
      return;
    }

    setOpenRouterKey(trimmed);
    setHasKey(true);
    setSavedMessage("Key saved on this device only.");
    trackEvent("openrouter_key_added");
  }, [openRouterKeyInput]);

  const handleModelChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const model = event.target.value;
      setSelectedModelState(model);
      setSelectedModel(model);
    },
    [],
  );

  const handleRenameWorkspace = useCallback(async () => {
    if (!onRenameWorkspace) {
      return;
    }

    const trimmed = workspaceNameInput.trim();
    if (trimmed.length === 0) {
      setRenameError("Workspace name is required.");
      return;
    }

    setIsRenaming(true);
    setRenameError(null);

    try {
      await onRenameWorkspace(trimmed);
      setSavedMessage("Workspace name updated.");
    } catch (error) {
      setRenameError(
        error instanceof Error ? error.message : "Could not rename workspace.",
      );
    } finally {
      setIsRenaming(false);
    }
  }, [onRenameWorkspace, workspaceNameInput]);

  const handleExport = useCallback(
    async (format: "markdown" | "json") => {
      if (!workspaceHeaders) {
        return;
      }

      const response = await apiFetch(`/api/export/chat?format=${format}`, {
        workspaceHeaders,
      });

      if (!response.ok) {
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        format === "markdown" ? "ragbase-chat.md" : "ragbase-chat.json";
      anchor.click();
      URL.revokeObjectURL(url);
    },
    [workspaceHeaders],
  );

  const handleDeleteWorkspace = useCallback(async () => {
    setIsDeleting(true);

    try {
      setShowDeleteDialog(false);
      onOpenChange(false);
      onWorkspaceDeleted?.();
    } finally {
      setIsDeleting(false);
    }
  }, [onOpenChange, onWorkspaceDeleted]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Workspaces are private to this browser. Nothing here is shared or
              used for model training.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {onRenameWorkspace ? (
              <section aria-label="Current workspace" className="space-y-3">
                <h3 className="text-sm font-semibold">Current workspace</h3>
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Name</Label>
                  <Input
                    id="workspace-name"
                    value={workspaceNameInput}
                    onChange={(event) => setWorkspaceNameInput(event.target.value)}
                    maxLength={64}
                    aria-label="Workspace name"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleRenameWorkspace()}
                    disabled={isRenaming}
                  >
                    {isRenaming ? "Saving…" : "Save name"}
                  </Button>
                  {renameError ? (
                    <p className="text-destructive text-xs" role="alert">
                      {renameError}
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section aria-label="OpenRouter API key" className="space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4" aria-hidden />
                <h3 className="text-sm font-semibold">OpenRouter key</h3>
              </div>
              <p className="text-muted-foreground text-xs">
                Optional. Stored only in this browser and shared across
                workspaces. Unlock higher daily limits and choose your model.
              </p>
              <div className="space-y-2">
                <Label htmlFor="openrouter-key">API key</Label>
                <Input
                  id="openrouter-key"
                  type="password"
                  autoComplete="off"
                  value={openRouterKeyInput}
                  onChange={(event) => setOpenRouterKeyInput(event.target.value)}
                  placeholder="sk-or-…"
                  aria-label="OpenRouter API key"
                />
                <Button type="button" size="sm" onClick={handleSaveKey}>
                  Save key
                </Button>
                {savedMessage ? (
                  <p className="text-muted-foreground text-xs" role="status">
                    {savedMessage}
                  </p>
                ) : null}
              </div>

              {hasKey ? (
                <div className="space-y-2">
                  <Label htmlFor="model-select">Model</Label>
                  <select
                    id="model-select"
                    value={selectedModel}
                    onChange={handleModelChange}
                    aria-label="Choose AI model"
                    className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {MODEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </section>

            <section aria-label="Export chat" className="space-y-3">
              <div className="flex items-center gap-2">
                <Download className="size-4" aria-hidden />
                <h3 className="text-sm font-semibold">Export chat</h3>
              </div>
              <p className="text-muted-foreground text-xs">
                Downloads chat history for the current workspace only.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleExport("markdown")}
                  disabled={!workspaceHeaders}
                >
                  Download Markdown
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleExport("json")}
                  disabled={!workspaceHeaders}
                >
                  Download JSON
                </Button>
              </div>
            </section>

            <section aria-label="Privacy" className="space-y-2">
              <h3 className="text-sm font-semibold">Privacy</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Documents are stored for {LIMITS.RETENTION_DAYS} days after your
                last visit, then automatically removed. You can delete the
                current workspace below at any time.
              </p>
            </section>

            <section aria-label="Delete workspace" className="space-y-3">
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 aria-hidden />
                Delete current workspace
              </Button>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {activeWorkspaceName ?? "this workspace"}?</DialogTitle>
            <DialogDescription>
              All documents and messages in this workspace will be permanently
              removed from our servers. Your other workspaces on this device are
              not affected.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
              onClick={() => void handleDeleteWorkspace()}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete workspace"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
