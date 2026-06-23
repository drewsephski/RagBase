"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Download, KeyRound, Trash2, type LucideIcon } from "lucide-react";
import { DEFAULT_MODEL, LIMITS } from "@/lib/domain/definitions";
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
import { WorkspaceRecoverySection } from "@/app/ui/settings/workspace-recovery-section";
import { AccountSection } from "@/app/ui/settings/account-section";
import type { UseAuthState } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
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
  onOpenRecoverySetup?: () => void;
  showRecoverySection?: boolean;
  auth?: UseAuthState;
  onAccountSynced?: () => void;
}

interface SettingsSectionProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section aria-label={title} className={cn("settings-section space-y-2", className)}>
      <div className="settings-section-header">
        {Icon ? <Icon className="text-muted-foreground size-3.5 shrink-0" aria-hidden /> : null}
        <h3>{title}</h3>
      </div>
      {description ? <p className="settings-section-desc">{description}</p> : null}
      {children}
    </section>
  );
}

export function SettingsPanel({
  open,
  onOpenChange,
  workspaceHeaders,
  activeWorkspaceName,
  onRenameWorkspace,
  onWorkspaceDeleted,
  onOpenRecoverySetup,
  showRecoverySection = false,
  auth,
  onAccountSynced,
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
        <DialogContent className="max-h-[min(90vh,52rem)] gap-3 overflow-y-auto sm:max-w-3xl">
          <DialogHeader className="gap-1 pb-0.5">
            <DialogTitle className="text-base tracking-tight">Settings</DialogTitle>
            <DialogDescription className="text-xs leading-snug">
              Workspaces stay private by default. Sign in optionally to sync chats
              across devices.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2.5 lg:grid-cols-2">
            {auth ? (
              <AccountSection
                auth={auth}
                workspaceHeaders={workspaceHeaders}
                onAccountSynced={onAccountSynced}
                compact
              />
            ) : null}

            {onRenameWorkspace ? (
              <SettingsSection
                title="Current workspace"
                description="Rename this workspace or save a recovery link."
              >
                <div className="settings-form-row">
                  <Label htmlFor="workspace-name">Name</Label>
                  <Input
                    id="workspace-name"
                    value={workspaceNameInput}
                    onChange={(event) => setWorkspaceNameInput(event.target.value)}
                    maxLength={64}
                    aria-label="Workspace name"
                    className="min-w-0 flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0 sm:ml-auto"
                    onClick={() => void handleRenameWorkspace()}
                    disabled={isRenaming}
                  >
                    {isRenaming ? "Saving…" : "Save"}
                  </Button>
                </div>
                {renameError ? (
                  <p className="text-destructive text-[11px]" role="alert">
                    {renameError}
                  </p>
                ) : null}
                {showRecoverySection ? (
                  <WorkspaceRecoverySection
                    onOpenRecoverySetup={onOpenRecoverySetup}
                    compact
                  />
                ) : null}
              </SettingsSection>
            ) : null}

            {!onRenameWorkspace && showRecoverySection ? (
              <SettingsSection title="Recovery link">
                <WorkspaceRecoverySection
                  onOpenRecoverySetup={onOpenRecoverySetup}
                  compact
                />
              </SettingsSection>
            ) : null}

            <SettingsSection
              icon={KeyRound}
              title="OpenRouter key"
              description="Optional. Stored in this browser only — unlock higher limits, model choice, and OCR for larger scans."
              className={auth && onRenameWorkspace ? undefined : "lg:col-span-2"}
            >
              <div className="ingest-composer rounded-xl border p-1">
                <div className="settings-form-row gap-1.5 sm:gap-1.5">
                  <Label htmlFor="openrouter-key" className="sr-only sm:not-sr-only">
                    API key
                  </Label>
                  <Input
                    id="openrouter-key"
                    type="password"
                    autoComplete="off"
                    value={openRouterKeyInput}
                    onChange={(event) => setOpenRouterKeyInput(event.target.value)}
                    placeholder="sk-or-…"
                    aria-label="OpenRouter API key"
                    className="min-w-0 flex-1 border-0 shadow-none focus-visible:ring-1"
                  />
                  <Button type="button" size="sm" className="shrink-0" onClick={handleSaveKey}>
                    Save key
                  </Button>
                </div>
              </div>

              {hasKey ? (
                <div className="settings-form-row">
                  <Label htmlFor="model-select">Model</Label>
                  <select
                    id="model-select"
                    value={selectedModel}
                    onChange={handleModelChange}
                    aria-label="Choose AI model"
                    className="surface-premium-inset border-input/80 focus-visible:ring-ring h-9 min-w-0 flex-1 rounded-xl border px-3 text-xs focus-visible:ring-1 focus-visible:outline-none sm:text-sm"
                  >
                    {MODEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {savedMessage ? (
                <p className="text-muted-foreground text-[11px]" role="status">
                  {savedMessage}
                </p>
              ) : null}
              {hasKey ? (
                <p className="text-muted-foreground text-[11px] leading-snug">
                  OCR for larger scans uses your OpenRouter key.
                </p>
              ) : null}
            </SettingsSection>

            <SettingsSection
              icon={Download}
              title="Export chat"
              description="Download chat history for the current workspace."
            >
              <div className="settings-inline-actions">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleExport("markdown")}
                  disabled={!workspaceHeaders}
                >
                  Markdown
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleExport("json")}
                  disabled={!workspaceHeaders}
                >
                  JSON
                </Button>
              </div>
            </SettingsSection>

            <SettingsSection
              title="Privacy"
              description={`Documents and chat history are kept for ${LIMITS.RETENTION_DAYS} days after your last visit, then removed — unless you save a recovery link or upgrade to Pro.`}
              className="lg:col-span-2"
            />

            <SettingsSection title="Danger zone" className="lg:col-span-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 aria-hidden />
                Delete current workspace
              </Button>
            </SettingsSection>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {activeWorkspaceName ?? "this workspace"}?</DialogTitle>
            <DialogDescription>
              All documents and messages in this workspace will be permanently
              removed from our servers. Your other workspaces on this device are
              not affected.
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
