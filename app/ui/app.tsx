"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CreateWorkspaceOptions } from "@/lib/domain/definitions";
import { APP_PATH } from "@/lib/domain/site";
import { useWorkspaces } from "@/hooks/use-workspace";
import { useWorkspaceTemplate } from "@/hooks/use-workspace-template";
import { useSources } from "@/hooks/use-sources";
import { useIngestion } from "@/hooks/use-ingestion";
import { trackEvent } from "@/lib/analytics/track";
import {
  peekPendingPrompt,
  setPendingPrompt,
  clearPendingPrompt,
} from "@/lib/templates/pending-prompt";
import {
  parsePromptUrlParam,
  PROMPT_URL_PARAM,
} from "@/lib/templates/prompt-link";
import { LandingHome } from "@/app/ui/home/landing-home";
import { UrlIngestChoiceDialog } from "@/app/ui/home/url-ingest-choice-dialog";
import { AppShell } from "@/app/ui/layout/app-shell";
import { FullSitePaywallDialog } from "@/app/ui/upsell/full-site-paywall-dialog";
import { Loader2 } from "lucide-react";
import { SettingsPanel } from "@/app/ui/settings/settings-panel";

function AppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    workspaces,
    activeWorkspace,
    headers,
    isReady,
    error: workspaceError,
    switchWorkspace,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
  } = useWorkspaces();

  const activeWorkspaceId = activeWorkspace?.id ?? null;

  const {
    sources,
    isLoading: sourcesLoading,
    error: sourcesError,
    scopedSourceId,
    showAppShell,
    refresh,
    bumpRefresh,
    resetSources,
    deleteSource,
    reprocessSource,
    toggleScope,
  } = useSources({
    headers,
    activeWorkspaceId,
    isReady,
  });

  const handleIngestionSuccess = useCallback(async () => {
    await refresh();
    bumpRefresh();
  }, [bumpRefresh, refresh]);

  const ingestion = useIngestion({
    headers,
    onIngestionSuccess: handleIngestionSuccess,
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingPromptHint, setPendingPromptHint] = useState<string | null>(null);
  const [templateRoutingDismissed, setTemplateRoutingDismissed] = useState(false);
  const promptDeeplinkAppliedRef = useRef(false);

  const { template, isApplyingTemplate } = useWorkspaceTemplate({
    isReady,
    workspaces,
    activeWorkspace,
    createWorkspace,
    switchWorkspace,
    templateRoutingDismissed,
  });

  useEffect(() => {
    setPendingPromptHint(peekPendingPrompt());
  }, []);

  useEffect(() => {
    if (promptDeeplinkAppliedRef.current) {
      return;
    }

    const prompt = parsePromptUrlParam(searchParams.get(PROMPT_URL_PARAM));

    if (!prompt) {
      return;
    }

    promptDeeplinkAppliedRef.current = true;
    setPendingPrompt(prompt);
    setPendingPromptHint(prompt);
    trackEvent("prompt_deeplink_opened", {
      has_template: Boolean(searchParams.get("template")),
      prompt_length: prompt.length,
    });

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete(PROMPT_URL_PARAM);
    const query = nextParams.toString();
    router.replace(query ? `${APP_PATH}?${query}` : APP_PATH);
  }, [router, searchParams]);

  const handlePromptChipSelect = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
    setPendingPromptHint(prompt);
  }, []);

  useEffect(() => {
    if (!searchParams.get("template")) {
      setTemplateRoutingDismissed(false);
    }
  }, [searchParams]);

  const dismissTemplateUrlRoute = useCallback(() => {
    if (!searchParams.get("template")) {
      return;
    }

    setTemplateRoutingDismissed(true);
    router.replace(APP_PATH);
  }, [router, searchParams]);

  const clearQueuedPrompt = useCallback(() => {
    clearPendingPrompt();
    setPendingPromptHint(null);
  }, []);

  const handleSwitchWorkspace = useCallback(
    (id: string) => {
      clearQueuedPrompt();
      switchWorkspace(id);
      dismissTemplateUrlRoute();
    },
    [clearQueuedPrompt, dismissTemplateUrlRoute, switchWorkspace],
  );

  const handleCreateWorkspace = useCallback(
    async (options?: CreateWorkspaceOptions) => {
      clearQueuedPrompt();
      await createWorkspace(options);
      dismissTemplateUrlRoute();
    },
    [clearQueuedPrompt, createWorkspace, dismissTemplateUrlRoute],
  );

  const handleWorkspaceDeleted = useCallback(async () => {
    if (!activeWorkspace) {
      return;
    }

    await deleteWorkspace(activeWorkspace.id);
    resetSources();
    bumpRefresh();
  }, [activeWorkspace, bumpRefresh, deleteWorkspace, resetSources]);

  const paywallDialogs = (
    <>
      <UrlIngestChoiceDialog
        open={ingestion.urlChoiceOpen}
        onOpenChange={ingestion.setUrlChoiceOpen}
        url={ingestion.pendingRootUrl ?? ""}
        onSinglePage={(url) => void ingestion.submitSinglePage(url)}
        onCrawlSite={ingestion.handleRootUrlCrawlSite}
      />

      <FullSitePaywallDialog
        open={ingestion.paywallOpen}
        onOpenChange={ingestion.setPaywallOpen}
        pendingUrl={ingestion.paywallPendingUrl}
        workspaceHeaders={headers}
        onAddPageOnly={
          ingestion.paywallPendingUrl
            ? ingestion.handlePaywallAddPageOnly
            : undefined
        }
        surface={ingestion.paywallSurface}
      />
    </>
  );

  if (!isReady || isApplyingTemplate) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4 pt-safe sm:p-6">
        <div className="text-muted-foreground flex items-center gap-2 text-center text-sm">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          {template
            ? `Setting up ${template.workspaceName}…`
            : "Setting up your private workspace…"}
        </div>
      </div>
    );
  }

  if (workspaceError) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4 pt-safe sm:p-6">
        <p className="text-destructive max-w-sm text-center text-sm" role="alert">
          {workspaceError}
        </p>
      </div>
    );
  }

  const workspaceSwitcherProps = {
    workspaces,
    activeWorkspace,
    onSwitch: handleSwitchWorkspace,
    onCreate: handleCreateWorkspace,
    onRename: renameWorkspace,
    onDelete: deleteWorkspace,
  };

  if (showAppShell) {
    return (
      <>
        <AppShell
          workspaceHeaders={headers}
          activeWorkspaceId={activeWorkspaceId}
          workspaceSwitcherProps={workspaceSwitcherProps}
          sources={sources}
          sourcesLoading={sourcesLoading}
          sourcesError={sourcesError}
          scopedSourceId={scopedSourceId}
          onToggleScope={toggleScope}
          onDeleteSource={deleteSource}
          onReprocessSource={reprocessSource}
          onUpload={ingestion.upload}
          onUrlSubmit={ingestion.submitUrlWithChoice}
          onFullSitePaywallOpen={() =>
            ingestion.openFullSitePaywall(undefined, "crawl_hint")
          }
          onWorkspaceDeleted={() => void handleWorkspaceDeleted()}
          template={template}
        />

        {paywallDialogs}
      </>
    );
  }

  return (
    <>
      <LandingHome
        onUrlSubmit={ingestion.submitUrlWithChoice}
        onUpload={ingestion.upload}
        onOpenSettings={() => setSettingsOpen(true)}
        onPromptChipSelect={handlePromptChipSelect}
        onFullSitePaywallOpen={() =>
          ingestion.openFullSitePaywall(undefined, "crawl_hint")
        }
        pendingPromptHint={
          pendingPromptHint
            ? `Queued: "${pendingPromptHint}" — we'll ask this when your first document is ready.`
            : undefined
        }
        disabled={!headers}
        template={template}
        workspaceSwitcherProps={workspaceSwitcherProps}
      />

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        workspaceHeaders={headers}
        activeWorkspaceName={activeWorkspace?.name}
        onRenameWorkspace={
          activeWorkspace
            ? (name) => renameWorkspace(activeWorkspace.id, name)
            : undefined
        }
        onWorkspaceDeleted={() => void handleWorkspaceDeleted()}
      />

      {paywallDialogs}
    </>
  );
}

export function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center p-4 pt-safe sm:p-6">
          <div className="text-muted-foreground flex items-center gap-2 text-center text-sm">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            Loading workspace…
          </div>
        </div>
      }
    >
      <AppContent />
    </Suspense>
  );
}
