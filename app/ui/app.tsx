"use client";

import { useCallback, useEffect, useState } from "react";
import type { Source } from "@/app/lib/definitions";
import { useWorkspaces } from "@/hooks/use-workspace";
import { apiFetch, apiJson, ApiError } from "@/lib/api/client";
import { LandingHome } from "@/app/ui/home/landing-home";
import { AppShell } from "@/app/ui/layout/app-shell";
import { CrawlTeaser } from "@/app/ui/upsell/crawl-teaser";
import { Loader2 } from "lucide-react";
import { SettingsPanel } from "@/app/ui/settings/settings-panel";

interface UrlResponse {
  source?: Source;
  teaser?: boolean;
  message?: string;
  url?: string;
}

interface SourcesResponse {
  sources: Source[];
}

export function App() {
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
  const [crawlTeaserOpen, setCrawlTeaserOpen] = useState(false);
  const [crawlTeaserUrl, setCrawlTeaserUrl] = useState<string | undefined>();
  const [crawlTeaserMessage, setCrawlTeaserMessage] = useState<string | undefined>();

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

  const bumpRefresh = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

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
        throw new ApiError(message, response.status);
      }

      await fetchSources();
      bumpRefresh();
    },
    [bumpRefresh, fetchSources, headers],
  );

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

      if (data.teaser) {
        setCrawlTeaserUrl(data.url ?? url);
        setCrawlTeaserMessage(data.message);
        setCrawlTeaserOpen(true);
        return data;
      }

      await fetchSources();
      bumpRefresh();
      return data;
    },
    [bumpRefresh, fetchSources, headers],
  );

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

  if (!isReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4 pt-safe sm:p-6">
        <div className="text-muted-foreground flex items-center gap-2 text-center text-sm">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          Setting up your private workspace…
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
    onSwitch: switchWorkspace,
    onCreate: createWorkspace,
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
          onUrlSubmit={handleUrlSubmit}
          onWorkspaceDeleted={() => void handleWorkspaceDeleted()}
        />

        <CrawlTeaser
          open={crawlTeaserOpen}
          onOpenChange={setCrawlTeaserOpen}
          url={crawlTeaserUrl}
          message={crawlTeaserMessage}
        />
      </>
    );
  }

  return (
    <>
      <LandingHome
        onUrlSubmit={handleUrlSubmit}
        onUpload={handleUpload}
        onOpenSettings={() => setSettingsOpen(true)}
        disabled={!headers}
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

      <CrawlTeaser
        open={crawlTeaserOpen}
        onOpenChange={setCrawlTeaserOpen}
        url={crawlTeaserUrl}
        message={crawlTeaserMessage}
      />
    </>
  );
}
