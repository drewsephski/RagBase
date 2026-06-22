"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CreateWorkspaceOptions, Source } from "@/app/lib/definitions";
import { APP_PATH } from "@/app/lib/site";
import { useWorkspaces } from "@/hooks/use-workspace";
import { useWorkspaceTemplate } from "@/hooks/use-workspace-template";
import { apiFetch, apiJson, ApiError } from "@/lib/api/client";
import { trackEvent } from "@/lib/analytics/track";
import { trackPaidIntent } from "@/lib/analytics/paid-intent";
import { trackLimitBoundary } from "@/lib/analytics/limit-boundary";
import { isRootUrl } from "@/lib/ingestion/url-utils";
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

interface UrlResponse {
  source?: Source;
  teaser?: boolean;
  message?: string;
  notice?: string;
  url?: string;
}

interface SourcesResponse {
  sources: Source[];
}

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
  const [sources, setSources] = useState<Source[]>([]);
  const [hasLoadedSources, setHasLoadedSources] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [scopedSourceId, setScopedSourceId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallPendingUrl, setPaywallPendingUrl] = useState<string | undefined>();
  const [paywallSurface, setPaywallSurface] = useState("paywall_dialog");
  const [urlChoiceOpen, setUrlChoiceOpen] = useState(false);
  const [pendingRootUrl, setPendingRootUrl] = useState<string | null>(null);
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

  const activeWorkspaceId = activeWorkspace?.id ?? null;

  const fetchSources = useCallback(async () => {
    if (!headers) {
      return;
    }

    try {
      const data = await apiJson<SourcesResponse>("/api/sources", {
        workspaceHeaders: headers,
      });
      setSources(data.sources);
    } catch {
      setSources([]);
    } finally {
      setHasLoadedSources(true);
    }
  }, [headers]);

  useEffect(() => {
    if (!isReady || !headers || !activeWorkspaceId) {
      return;
    }

    setSources([]);
    setHasLoadedSources(false);
    setScopedSourceId(null);
    void fetchSources();
  }, [activeWorkspaceId, fetchSources, headers, isReady, refreshToken]);

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

  const bumpRefresh = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

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

  const handleUpload = useCallback(
    async (file: File) => {
      if (!headers) {
        throw new Error("Workspace is not ready yet.");
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await apiFetch("/api/sources/upload", {
        method: "POST",
        body: formData,
        workspaceHeaders: headers,
      });

      if (!response.ok) {
        let message = "Upload failed. Please try again.";
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) {
            message = body.error;
          }
        } catch {
          // ignore
        }
        const apiError = new ApiError(message, response.status);
        trackLimitBoundary(apiError);
        throw apiError;
      }

      trackEvent("file_uploaded", {
        extension: file.name.split(".").pop()?.toLowerCase() ?? "unknown",
      });

      await fetchSources();
      bumpRefresh();
    },
    [bumpRefresh, fetchSources, headers],
  );

  const openFullSitePaywall = useCallback((url?: string, surface = "crawl_hint") => {
    trackPaidIntent("full_site_crawl", { surface });
    setPaywallSurface(surface);
    setPaywallPendingUrl(url);
    setPaywallOpen(true);
  }, []);

  const handleUrlSubmit = useCallback(
    async (url: string) => {
      if (!headers) {
        throw new Error("Workspace is not ready yet.");
      }

      const data = await apiJson<UrlResponse>("/api/sources/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        workspaceHeaders: headers,
      });

      trackEvent("url_ingested", {
        is_homepage: Boolean(data.notice),
      });

      await fetchSources();
      bumpRefresh();
      return data;
    },
    [bumpRefresh, fetchSources, headers],
  );

  const handleUrlSubmitWithChoice = useCallback(
    async (url: string) => {
      try {
        if (isRootUrl(url)) {
          setPendingRootUrl(url);
          setUrlChoiceOpen(true);
          return;
        }

        return await handleUrlSubmit(url);
      } catch (error) {
        if (error instanceof ApiError) {
          trackLimitBoundary(error);
        }
        throw error;
      }
    },
    [handleUrlSubmit],
  );

  const handleRootUrlSinglePage = useCallback(
    async (url: string) => {
      try {
        return await handleUrlSubmit(url);
      } catch (error) {
        if (error instanceof ApiError) {
          trackLimitBoundary(error);
        }
        throw error;
      }
    },
    [handleUrlSubmit],
  );

  const handleRootUrlCrawlSite = useCallback(
    (url: string) => {
      openFullSitePaywall(url, "root_url_choice");
    },
    [openFullSitePaywall],
  );

  const handlePaywallAddPageOnly = useCallback(() => {
    if (!paywallPendingUrl) {
      return;
    }

    void handleRootUrlSinglePage(paywallPendingUrl);
  }, [handleRootUrlSinglePage, paywallPendingUrl]);

  const handleWorkspaceDeleted = useCallback(async () => {
    if (!activeWorkspace) {
      return;
    }

    await deleteWorkspace(activeWorkspace.id);
    setSources([]);
    setHasLoadedSources(false);
    setScopedSourceId(null);
    bumpRefresh();
  }, [activeWorkspace, bumpRefresh, deleteWorkspace]);

  const paywallDialogs = (
    <>
      <UrlIngestChoiceDialog
        open={urlChoiceOpen}
        onOpenChange={setUrlChoiceOpen}
        url={pendingRootUrl ?? ""}
        onSinglePage={(url) => void handleRootUrlSinglePage(url)}
        onCrawlSite={handleRootUrlCrawlSite}
      />

      <FullSitePaywallDialog
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        pendingUrl={paywallPendingUrl}
        workspaceHeaders={headers}
        onAddPageOnly={paywallPendingUrl ? handlePaywallAddPageOnly : undefined}
        surface={paywallSurface}
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

  const showAppShell = hasLoadedSources && sources.length > 0;

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
          refreshToken={refreshToken}
          scopedSourceId={scopedSourceId}
          onScopedSourceChange={setScopedSourceId}
          onSourcesChange={setSources}
          onUpload={handleUpload}
          onUrlSubmit={handleUrlSubmitWithChoice}
          onFullSitePaywallOpen={() => openFullSitePaywall(undefined, "crawl_hint")}
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
        onUrlSubmit={handleUrlSubmitWithChoice}
        onUpload={handleUpload}
        onOpenSettings={() => setSettingsOpen(true)}
        onPromptChipSelect={handlePromptChipSelect}
        onFullSitePaywallOpen={() => openFullSitePaywall(undefined, "crawl_hint")}
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
