"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
import type { Source } from "@/lib/domain/definitions";
import type { WorkspaceTemplate } from "@/lib/domain/templates";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { ThemeToggle } from "@/components/theme-toggle";
import { RagBaseLogo } from "@/components/brand/ragbase-logo";
import { Button } from "@/components/ui/button";
import { SourceList } from "@/app/ui/sources/source-list";
import { ChatPanel } from "@/app/ui/chat/chat-panel";
import { SettingsPanel } from "@/app/ui/settings/settings-panel";
import { UploadZone } from "@/app/ui/home/upload-zone";
import { UrlInput } from "@/app/ui/home/url-input";
import { TrustMicrocopy } from "@/app/ui/home/trust-microcopy";
import { CrawlTeaserHint } from "@/app/ui/home/crawl-teaser-hint";
import {
  WorkspaceSwitcher,
  type WorkspaceSwitcherProps,
} from "@/app/ui/workspace/workspace-switcher";
import { cn } from "@/lib/utils";

interface AppShellProps {
  workspaceHeaders: WorkspaceHeaders | null;
  activeWorkspaceId: string | null;
  workspaceSwitcherProps: WorkspaceSwitcherProps;
  sources: Source[];
  sourcesLoading: boolean;
  sourcesError: string | null;
  scopedSourceId: string | null;
  onToggleScope: (sourceId: string) => void;
  onDeleteSource: (sourceId: string) => Promise<void>;
  onReprocessSource: (sourceId: string) => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  onUrlSubmit: (url: string) => Promise<{ teaser?: boolean; message?: string; url?: string } | void>;
  onFullSitePaywallOpen?: () => void;
  onWorkspaceDeleted: () => void;
  template?: WorkspaceTemplate | null;
  recoveryBanner?: ReactNode;
  onOpenRecoverySetup?: () => void;
}

const SIDEBAR_WIDTH = "min(280px, 85vw)";

function SidebarContent({
  sources,
  sourcesLoading,
  sourcesError,
  scopedSourceId,
  onToggleScope,
  onDeleteSource,
  onReprocessSource,
  onUpload,
  onUrlSubmit,
  onFullSitePaywallOpen,
}: Pick<
  AppShellProps,
  | "sources"
  | "sourcesLoading"
  | "sourcesError"
  | "scopedSourceId"
  | "onToggleScope"
  | "onDeleteSource"
  | "onReprocessSource"
  | "onUpload"
  | "onUrlSubmit"
  | "onFullSitePaywallOpen"
>) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SourceList
          sources={sources}
          isLoading={sourcesLoading}
          error={sourcesError}
          scopedSourceId={scopedSourceId}
          onToggleScope={onToggleScope}
          onReprocess={onReprocessSource}
          onDelete={onDeleteSource}
        />
      </div>

      <div className="shrink-0 space-y-2 border-t pt-2.5 sm:pt-3">
        <UploadZone onUpload={onUpload} compact />
        <UrlInput onSubmit={onUrlSubmit} />
        {onFullSitePaywallOpen ? (
          <CrawlTeaserHint onLearnMore={onFullSitePaywallOpen} />
        ) : null}
        <TrustMicrocopy compact className="text-left" />
      </div>
    </>
  );
}

export function AppShell({
  workspaceHeaders,
  activeWorkspaceId,
  workspaceSwitcherProps,
  sources,
  sourcesLoading,
  sourcesError,
  scopedSourceId,
  onToggleScope,
  onDeleteSource,
  onReprocessSource,
  onUpload,
  onUrlSubmit,
  onFullSitePaywallOpen,
  onWorkspaceDeleted,
  template = null,
  recoveryBanner,
  onOpenRecoverySetup,
}: AppShellProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  const sidebarVisible = isDesktop ? desktopSidebarOpen : mobileSidebarOpen;

  const handleCloseMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    if (isDesktop) {
      setDesktopSidebarOpen((current) => !current);
      return;
    }

    setMobileSidebarOpen((current) => !current);
  }, [isDesktop]);

  const sidebarToggle = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-8 shrink-0"
      onClick={handleToggleSidebar}
      aria-expanded={sidebarVisible}
      aria-controls="documents-sidebar"
      aria-label={
        sidebarVisible
          ? isDesktop
            ? "Collapse documents panel"
            : "Close documents panel"
          : "Open documents panel"
      }
    >
      {sidebarVisible ? (
        isDesktop ? (
          <PanelLeftClose className="size-4" aria-hidden />
        ) : (
          <X className="size-4" aria-hidden />
        )
      ) : isDesktop ? (
        <PanelLeftOpen className="size-4" aria-hidden />
      ) : (
        <Menu className="size-4" aria-hidden />
      )}
    </Button>
  );

  useEffect(() => {
    if (!mobileSidebarOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileSidebarOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");

    function handleChange(event: MediaQueryListEvent | MediaQueryList) {
      setIsDesktop(event.matches);
      if (event.matches) {
        setMobileSidebarOpen(false);
      }
    }

    handleChange(mediaQuery);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden overscroll-none">
      <header className="border-border/60 bg-background/80 flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5 backdrop-blur-md pt-safe sm:gap-3 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <Link
            href="/"
            className="focus-visible:outline-ring min-w-0 shrink rounded-md outline-offset-4 focus-visible:outline-2"
            aria-label="RagBase home"
          >
            <RagBaseLogo markSize={28} className="min-w-0 shrink max-sm:[&_p]:text-xs" />
          </Link>
          <WorkspaceSwitcher {...workspaceSwitcherProps} />
          {sidebarToggle}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle />

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            <Settings aria-hidden />
          </Button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <button
          type="button"
          className={cn(
            "absolute inset-0 z-20 bg-black/40 transition-opacity duration-300 ease-out motion-reduce:transition-none md:hidden",
            mobileSidebarOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          )}
          onClick={handleCloseMobileSidebar}
          aria-label="Close documents panel"
          tabIndex={mobileSidebarOpen ? 0 : -1}
        />

        <aside
          id="documents-sidebar"
          className={cn(
            "bg-surface-elevated/50 z-30 flex min-h-0 flex-col overflow-hidden border-r shadow-lg backdrop-blur-sm transition-[transform,width] duration-300 ease-in-out motion-reduce:transition-none",
            "absolute inset-y-0 left-0 md:relative md:inset-auto md:shadow-none",
            "max-md:w-[var(--sidebar-width)] max-md:pb-safe",
            mobileSidebarOpen
              ? "max-md:translate-x-0"
              : "max-md:pointer-events-none max-md:-translate-x-full",
            desktopSidebarOpen
              ? "md:w-[var(--sidebar-width)] md:shrink-0"
              : "md:w-0 md:shrink-0 md:border-r-0",
          )}
          style={{ "--sidebar-width": SIDEBAR_WIDTH } as CSSProperties}
          aria-label="Documents panel"
          aria-hidden={!sidebarVisible}
        >
          <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2.5 overflow-hidden p-2.5 sm:gap-3 sm:p-3">
            <SidebarContent
              sources={sources}
              sourcesLoading={sourcesLoading}
              sourcesError={sourcesError}
              scopedSourceId={scopedSourceId}
              onToggleScope={onToggleScope}
              onDeleteSource={onDeleteSource}
              onReprocessSource={onReprocessSource}
              onUpload={onUpload}
              onUrlSubmit={onUrlSubmit}
              onFullSitePaywallOpen={onFullSitePaywallOpen}
            />
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {recoveryBanner ? (
            <div className="border-border border-b px-3 py-2 sm:px-4">{recoveryBanner}</div>
          ) : null}
          <ChatPanel
            key={activeWorkspaceId ?? "no-workspace"}
            workspaceHeaders={workspaceHeaders}
            sources={sources}
            scopedSourceId={scopedSourceId}
            template={template}
          />
        </main>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        workspaceHeaders={workspaceHeaders}
        activeWorkspaceName={workspaceSwitcherProps.activeWorkspace?.name}
        onRenameWorkspace={
          workspaceSwitcherProps.activeWorkspace
            ? (name) =>
                workspaceSwitcherProps.onRename(
                  workspaceSwitcherProps.activeWorkspace!.id,
                  name,
                )
            : undefined
        }
        onWorkspaceDeleted={onWorkspaceDeleted}
        onOpenRecoverySetup={onOpenRecoverySetup}
      />
    </div>
  );
}
