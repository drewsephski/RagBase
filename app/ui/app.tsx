"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CreateWorkspaceOptions } from "@/lib/domain/definitions";
import { APP_PATH } from "@/lib/domain/site";
import { useWorkspaces, type UseWorkspacesState } from "@/hooks/use-workspace";
import { useWorkspaceTemplate } from "@/hooks/use-workspace-template";
import { useSources } from "@/hooks/use-sources";
import { useIngestion } from "@/hooks/use-ingestion";
import { useCheckoutFlow } from "@/hooks/use-checkout-flow";
import { trackEvent } from "@/lib/analytics/track";
import {
  isRecoveryConfirmedLocally,
  isRecoveryPromptDismissedLocally,
  isRecoverySaved,
  setRecoveryConfirmedLocally,
  setRecoveryPromptDismissedLocally,
} from "@/lib/billing/recovery-state";
import type { CheckoutReturnParams } from "@/lib/billing/checkout-return-state";
import type { SubscriptionStatusResponse } from "@/lib/billing/types";
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
import { CheckoutReturnHost } from "@/app/ui/billing/checkout-return-host";
import { RecoveryBanner } from "@/app/ui/billing/recovery-banner";
import { RecoverySetup } from "@/app/ui/billing/recovery-setup";
import { Loader2 } from "lucide-react";
import { SettingsPanel } from "@/app/ui/settings/settings-panel";
import { useAuth } from "@/hooks/use-auth";
import { reclaimSubscriptionForWorkspace, linkWorkspaceToAccount } from "@/lib/workspace/account-sync";
import { ReclaimNoticeBanner } from "@/app/ui/billing/reclaim-notice-banner";

interface AppContentProps {
  workspace: UseWorkspacesState;
  subscription: SubscriptionStatusResponse | null;
  refreshSubscription: () => Promise<void>;
  auth: ReturnType<typeof useAuth>;
  reclaimNotice?: string | null;
  onDismissReclaimNotice?: () => void;
}

function AppContent({
  workspace,
  subscription,
  refreshSubscription,
  auth,
  reclaimNotice = null,
  onDismissReclaimNotice,
}: AppContentProps) {
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
  } = workspace;

  const activeWorkspaceId = activeWorkspace?.id ?? null;

  const {
    sources,
    isLoading: sourcesLoading,
    error: sourcesError,
    scopedSourceId,
    scopedDocumentId,
    showAppShell,
    refresh,
    bumpRefresh,
    resetSources,
    deleteSource,
    reprocessSource,
    toggleScope,
    scopePage,
    cancelCrawl,
  } = useSources({
    headers,
    activeWorkspaceId,
    isReady,
  });

  const handleIngestionSuccess = useCallback(async () => {
    await refresh();
    bumpRefresh();
  }, [bumpRefresh, refresh]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showRecoverySetup, setShowRecoverySetup] = useState(false);
  const [freeRecoveryEligible, setFreeRecoveryEligible] = useState(false);
  const [recoveryPromptDismissed, setRecoveryPromptDismissed] = useState(false);
  const [pendingPromptHint, setPendingPromptHint] = useState<string | null>(null);

  const ingestion = useIngestion({
    headers,
    isProActive: subscription?.isProActive ?? false,
    onIngestionSuccess: handleIngestionSuccess,
  });

  const recoverySaved =
    Boolean(subscription?.recoveryLinkConfirmed) ||
    (activeWorkspaceId ? isRecoveryConfirmedLocally(activeWorkspaceId) : false);

  const showRecoveryBanner =
    Boolean(activeWorkspaceId) &&
    !showRecoverySetup &&
    !recoverySaved &&
    !recoveryPromptDismissed &&
    (subscription?.isProActive || freeRecoveryEligible);

  const showRecoverySection = Boolean(activeWorkspaceId) && !recoverySaved;

  const handleOpenRecoverySetup = useCallback(() => {
    setShowRecoverySetup(true);
  }, []);

  const handleRecoveryComplete = useCallback(() => {
    if (activeWorkspaceId) {
      setRecoveryConfirmedLocally(activeWorkspaceId);
    }
    setShowRecoverySetup(false);
    void refreshSubscription();
  }, [activeWorkspaceId, refreshSubscription]);

  const handleRecoveryDefer = useCallback(() => {
    setShowRecoverySetup(false);
  }, []);

  const handleDismissRecoveryBanner = useCallback(() => {
    if (activeWorkspaceId) {
      setRecoveryPromptDismissedLocally(activeWorkspaceId);
      setRecoveryPromptDismissed(true);
    }
    trackEvent("recovery_link_deferred", { surface: "banner" });
  }, [activeWorkspaceId]);

  const handleFirstAnswerComplete = useCallback(() => {
    if (!activeWorkspaceId) {
      return;
    }

    if (isRecoverySaved(activeWorkspaceId, subscription?.recoveryLinkConfirmed ?? false)) {
      return;
    }

    setFreeRecoveryEligible(true);
  }, [activeWorkspaceId, subscription?.recoveryLinkConfirmed]);

  useEffect(() => {
    setFreeRecoveryEligible(false);
    setRecoveryPromptDismissed(
      activeWorkspaceId ? isRecoveryPromptDismissedLocally(activeWorkspaceId) : false,
    );
  }, [activeWorkspaceId]);

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

  const handleWorkspaceDeleted = useCallback(
    async (options?: { cancelSubscription?: boolean }) => {
      if (!activeWorkspace) {
        return;
      }

      await deleteWorkspace(activeWorkspace.id, options);
      resetSources();
      bumpRefresh();
    },
    [activeWorkspace, bumpRefresh, deleteWorkspace, resetSources],
  );

  const paywallDialogs = (
    <>
      <UrlIngestChoiceDialog
        open={ingestion.urlChoiceOpen}
        onOpenChange={ingestion.setUrlChoiceOpen}
        url={ingestion.pendingRootUrl ?? ""}
        onSinglePage={(url) => ingestion.submitSinglePage(url)}
        onCrawlSite={ingestion.handleRootUrlCrawlSite}
      />

      <FullSitePaywallDialog
        open={ingestion.paywallOpen}
        onOpenChange={ingestion.setPaywallOpen}
        pendingUrl={ingestion.paywallPendingUrl}
        workspaceHeaders={headers}
        workspaceId={activeWorkspaceId}
        isProActive={subscription?.isProActive ?? false}
        onStartCrawl={(url) => {
          void ingestion.submitCrawl(url).catch(() => undefined);
        }}
        onAddPageOnly={
          ingestion.paywallPendingUrl
            ? ingestion.handlePaywallAddPageOnly
            : undefined
        }
        surface={ingestion.paywallSurface}
        auth={auth}
      />

      {showRecoverySetup && headers && activeWorkspaceId ? (
        <RecoverySetup
          workspaceId={activeWorkspaceId}
          workspaceHeaders={headers}
          context="workspace"
          onComplete={handleRecoveryComplete}
          onDefer={handleRecoveryDefer}
        />
      ) : null}
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
    isProActive: subscription?.isProActive ?? false,
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
          scopedDocumentId={scopedDocumentId}
          onToggleScope={toggleScope}
          onScopePage={scopePage}
          onCancelCrawl={cancelCrawl}
          onDeleteSource={deleteSource}
          onReprocessSource={reprocessSource}
          onUpload={ingestion.upload}
          onUrlSubmit={ingestion.submitUrlWithChoice}
          onFullSitePaywallOpen={() =>
            ingestion.openFullSitePaywall(undefined, "crawl_hint")
          }
          subscription={subscription}
          onWorkspaceDeleted={handleWorkspaceDeleted}
          template={template}
          recoveryBanner={
            showRecoveryBanner || reclaimNotice ? (
              <div className="space-y-2">
                {reclaimNotice ? (
                  <ReclaimNoticeBanner
                    message={reclaimNotice}
                    onDismiss={() => onDismissReclaimNotice?.()}
                  />
                ) : null}
                {showRecoveryBanner ? (
                  <RecoveryBanner
                    onSaveRecoveryLink={handleOpenRecoverySetup}
                    dismissible={!subscription?.isProActive}
                    onDismiss={handleDismissRecoveryBanner}
                  />
                ) : null}
              </div>
            ) : null
          }
          onOpenRecoverySetup={handleOpenRecoverySetup}
          showRecoverySection={showRecoverySection}
          onFirstAnswerComplete={handleFirstAnswerComplete}
          auth={auth}
          onAccountSynced={() => void workspace.syncAccountWorkspaces()}
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
        subscription={subscription}
        workspaceHeaders={headers}
        pendingPromptHint={
          pendingPromptHint
            ? `Queued: "${pendingPromptHint}" — we'll ask this when your first document is ready.`
            : undefined
        }
        ingestingUrl={ingestion.ingestingUrl}
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
        onWorkspaceDeleted={handleWorkspaceDeleted}
        isProActive={subscription?.isProActive ?? false}
        onOpenRecoverySetup={handleOpenRecoverySetup}
        showRecoverySection={showRecoverySection}
        auth={auth}
        onAccountSynced={() => void workspace.syncAccountWorkspaces()}
      />

      {paywallDialogs}
    </>
  );
}

interface AppProps {
  checkoutReturn: CheckoutReturnParams;
}

export function App({ checkoutReturn: initialReturn }: AppProps) {
  const auth = useAuth();
  const workspace = useWorkspaces();
  const activeWorkspaceId = workspace.activeWorkspace?.id ?? null;
  const [reclaimNotice, setReclaimNotice] = useState<string | null>(null);

  const checkoutFlow = useCheckoutFlow({
    initialReturn,
    headers: workspace.headers,
    activeWorkspaceId,
    isReady: workspace.isReady,
    onSwitchWorkspace: workspace.switchWorkspace,
  });

  useEffect(() => {
    setReclaimNotice(null);
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!auth.user || auth.isLoading) {
      return;
    }

    async function syncAccountAndReclaim() {
      if (
        workspace.headers?.["X-Workspace-Secret"] &&
        workspace.headers["X-Workspace-Id"]
      ) {
        try {
          await linkWorkspaceToAccount(workspace.headers);
        } catch {
          // Linking is best-effort; account sync still runs below.
        }
      }

      await workspace.syncAccountWorkspaces();

      if (!workspace.headers) {
        return;
      }

      const reclaimResult = await reclaimSubscriptionForWorkspace(workspace.headers);

      if (reclaimResult.reclaimed) {
        await checkoutFlow.refreshSubscription();
        return;
      }

      if (reclaimResult.error) {
        setReclaimNotice(reclaimResult.error.message);
      }
    }

    void syncAccountAndReclaim();
  }, [
    auth.isLoading,
    auth.user,
    checkoutFlow.refreshSubscription,
    workspace.headers,
    workspace.syncAccountWorkspaces,
  ]);

  return (
    <>
      <CheckoutReturnHost checkoutFlow={checkoutFlow} workspace={workspace} />

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
        <AppContent
          workspace={workspace}
          subscription={checkoutFlow.subscription}
          refreshSubscription={checkoutFlow.refreshSubscription}
          auth={auth}
          reclaimNotice={reclaimNotice}
          onDismissReclaimNotice={() => setReclaimNotice(null)}
        />
      </Suspense>
    </>
  );
}
