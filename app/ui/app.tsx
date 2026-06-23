"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CreateWorkspaceOptions } from "@/lib/domain/definitions";
import { APP_PATH } from "@/lib/domain/site";
import {
  buildCheckoutReturnLocation,
  isSameAppOrigin,
  replaceBrowserUrl,
} from "@/lib/site";
import { useWorkspaces } from "@/hooks/use-workspace";
import { useWorkspaceTemplate } from "@/hooks/use-workspace-template";
import { useSources } from "@/hooks/use-sources";
import { useIngestion } from "@/hooks/use-ingestion";
import { useSubscription } from "@/hooks/use-subscription";
import { trackEvent } from "@/lib/analytics/track";
import {
  isRecoveryConfirmedLocally,
  isRecoveryPromptDismissedLocally,
  isRecoverySaved,
  setRecoveryConfirmedLocally,
  setRecoveryPromptDismissedLocally,
} from "@/lib/billing/recovery-state";
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
import { CheckoutPending } from "@/app/ui/billing/checkout-pending";
import { RecoveryBanner } from "@/app/ui/billing/recovery-banner";
import { RecoverySetup } from "@/app/ui/billing/recovery-setup";
import type { RecoverySetupContext } from "@/app/ui/billing/recovery-setup";
import { Loader2 } from "lucide-react";
import { SettingsPanel } from "@/app/ui/settings/settings-panel";

interface AppContentProps {
  checkoutHandled: boolean;
  setCheckoutHandled: (handled: boolean) => void;
  showRecoverySetup: boolean;
  setShowRecoverySetup: (show: boolean) => void;
  recoverySetupContext: RecoverySetupContext;
  setRecoverySetupContext: (context: RecoverySetupContext) => void;
}

function AppContent({
  checkoutHandled,
  setCheckoutHandled,
  showRecoverySetup,
  setShowRecoverySetup,
  recoverySetupContext,
  setRecoverySetupContext,
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
  } = useWorkspaces();

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
  const [freeRecoveryEligible, setFreeRecoveryEligible] = useState(false);
  const checkoutCancelTrackedRef = useRef(false);
  const [pendingPromptHint, setPendingPromptHint] = useState<string | null>(null);
  const checkoutParam = searchParams.get("checkout");
  const checkoutSessionId = searchParams.get("session_id");
  const isCheckoutSuccess = checkoutParam === "success";
  const [isRedirectingCheckoutReturn, setIsRedirectingCheckoutReturn] = useState(false);

  useEffect(() => {
    if (checkoutParam !== "success" || typeof window === "undefined") {
      return;
    }

    if (isSameAppOrigin(window.location.origin)) {
      return;
    }

    setIsRedirectingCheckoutReturn(true);
    window.location.replace(
      buildCheckoutReturnLocation(
        window.location.pathname,
        window.location.search,
      ),
    );
  }, [checkoutParam]);

  const { subscription, isPendingActivation, refresh: refreshSubscription } =
    useSubscription({
      headers,
      enabled: isReady && Boolean(headers),
      pollWhilePending: isCheckoutSuccess && !checkoutHandled && !isRedirectingCheckoutReturn,
      checkoutSessionId,
    });

  const ingestion = useIngestion({
    headers,
    isProActive: subscription?.isProActive ?? false,
    onIngestionSuccess: handleIngestionSuccess,
  });

  useEffect(() => {
    if (checkoutParam !== "cancel" || checkoutCancelTrackedRef.current) {
      return;
    }

    checkoutCancelTrackedRef.current = true;
    replaceBrowserUrl(APP_PATH);
  }, [checkoutParam]);

  useEffect(() => {
    if (!isCheckoutSuccess || checkoutHandled || !subscription?.isProActive) {
      return;
    }

    setCheckoutHandled(true);
    replaceBrowserUrl(APP_PATH);

    if (!activeWorkspaceId) {
      return;
    }

    const confirmed =
      subscription.recoveryLinkConfirmed ||
      isRecoveryConfirmedLocally(activeWorkspaceId);

    if (!confirmed) {
      setRecoverySetupContext("pro_checkout");
      setShowRecoverySetup(true);
    }
  }, [
    activeWorkspaceId,
    checkoutHandled,
    isCheckoutSuccess,
    subscription,
  ]);

  const recoverySaved =
    Boolean(subscription?.recoveryLinkConfirmed) ||
    (activeWorkspaceId ? isRecoveryConfirmedLocally(activeWorkspaceId) : false);

  const showRecoveryBanner =
    Boolean(activeWorkspaceId) &&
    !showRecoverySetup &&
    !recoverySaved &&
    (subscription?.isProActive ||
      (freeRecoveryEligible &&
        activeWorkspaceId &&
        !isRecoveryPromptDismissedLocally(activeWorkspaceId)));

  const showRecoverySection = Boolean(activeWorkspaceId) && !recoverySaved;

  const handleOpenRecoverySetup = useCallback(() => {
    setRecoverySetupContext("workspace");
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

  const handleWorkspaceDeleted = useCallback(async () => {
    if (!activeWorkspace) {
      return;
    }

    await deleteWorkspace(activeWorkspace.id);
    resetSources();
    bumpRefresh();
  }, [activeWorkspace, bumpRefresh, deleteWorkspace, resetSources]);

  const checkoutPendingOverlay =
    isCheckoutSuccess && !isRedirectingCheckoutReturn && (isPendingActivation || !checkoutHandled) ? (
      <CheckoutPending
        timedOut={
          isReady &&
          !isPendingActivation &&
          !subscription?.isProActive
        }
        onRefresh={() => void refreshSubscription()}
      />
    ) : null;

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
      />

      {checkoutPendingOverlay}

      {showRecoverySetup && headers && activeWorkspaceId ? (
        <RecoverySetup
          workspaceId={activeWorkspaceId}
          workspaceHeaders={headers}
          context={recoverySetupContext}
          onComplete={handleRecoveryComplete}
          onDefer={handleRecoveryDefer}
        />
      ) : null}
    </>
  );

  if (!isReady || isApplyingTemplate) {
    return (
      <>
        <div className="flex min-h-dvh items-center justify-center p-4 pt-safe sm:p-6">
          <div className="text-muted-foreground flex items-center gap-2 text-center text-sm">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            {isRedirectingCheckoutReturn
              ? "Returning to RagBase…"
              : template
                ? `Setting up ${template.workspaceName}…`
                : isCheckoutSuccess
                  ? "Confirming your payment…"
                  : "Setting up your private workspace…"}
          </div>
        </div>
        {checkoutPendingOverlay}
      </>
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
          onWorkspaceDeleted={() => void handleWorkspaceDeleted()}
          template={template}
          recoveryBanner={
            showRecoveryBanner ? (
              <RecoveryBanner
                onSaveRecoveryLink={handleOpenRecoverySetup}
                dismissible={!subscription?.isProActive}
                onDismiss={handleDismissRecoveryBanner}
              />
            ) : null
          }
          onOpenRecoverySetup={handleOpenRecoverySetup}
          showRecoverySection={showRecoverySection}
          onFirstAnswerComplete={handleFirstAnswerComplete}
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
        onOpenRecoverySetup={handleOpenRecoverySetup}
        showRecoverySection={showRecoverySection}
      />

      {paywallDialogs}
    </>
  );
}

export function App() {
  const [checkoutHandled, setCheckoutHandled] = useState(false);
  const [showRecoverySetup, setShowRecoverySetup] = useState(false);
  const [recoverySetupContext, setRecoverySetupContext] =
    useState<RecoverySetupContext>("workspace");

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
      <AppContent
        checkoutHandled={checkoutHandled}
        setCheckoutHandled={setCheckoutHandled}
        showRecoverySetup={showRecoverySetup}
        setShowRecoverySetup={setShowRecoverySetup}
        recoverySetupContext={recoverySetupContext}
        setRecoverySetupContext={setRecoverySetupContext}
      />
    </Suspense>
  );
}
