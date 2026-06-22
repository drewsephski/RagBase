"use client";

import { useState } from "react";
import { Menu, Settings, Trash2 } from "lucide-react";
import type { Source } from "@/app/lib/definitions";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import { ThemeToggle } from "@/components/theme-toggle";
import { RagBaseLogo } from "@/components/brand/ragbase-logo";
import { Button } from "@/components/ui/button";
import { SourceList } from "@/app/ui/sources/source-list";
import { ChatPanel } from "@/app/ui/chat/chat-panel";
import { SettingsPanel } from "@/app/ui/settings/settings-panel";
import { UploadZone } from "@/app/ui/home/upload-zone";
import { UrlInput } from "@/app/ui/home/url-input";
import { cn } from "@/lib/utils";

interface AppShellProps {
  workspaceHeaders: WorkspaceHeaders | null;
  sources: Source[];
  refreshToken: number;
  scopedSourceId: string | null;
  onScopedSourceChange: (sourceId: string | null) => void;
  onSourcesChange: (sources: Source[]) => void;
  onUpload: (file: File) => Promise<void>;
  onUrlSubmit: (url: string) => Promise<{ teaser?: boolean; message?: string; url?: string } | void>;
  onWorkspaceDeleted: () => void;
}

export function AppShell({
  workspaceHeaders,
  sources,
  refreshToken,
  scopedSourceId,
  onScopedSourceChange,
  onSourcesChange,
  onUpload,
  onUrlSubmit,
  onWorkspaceDeleted,
}: AppShellProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"sources" | "chat">("chat");

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <RagBaseLogo markSize={28} className="min-w-0" />

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="md:hidden"
            onClick={() =>
              setMobilePanel((current) =>
                current === "sources" ? "chat" : "sources",
              )
            }
            aria-label="Toggle documents panel"
          >
            <Menu aria-hidden />
            {mobilePanel === "sources" ? "Chat" : "Docs"}
          </Button>

          <ThemeToggle />

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            <Settings aria-hidden />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => setSettingsOpen(true)}
            aria-label="Delete workspace"
          >
            <Trash2 className="text-destructive" aria-hidden />
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(280px,340px)_1fr]">
        <aside
          className={cn(
            "border-b md:border-r md:border-b-0",
            mobilePanel === "sources" ? "flex min-h-0 flex-col" : "hidden md:flex md:min-h-0 md:flex-col",
          )}
          aria-label="Documents panel"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
            <SourceList
              workspaceHeaders={workspaceHeaders}
              scopedSourceId={scopedSourceId}
              onScopedSourceChange={onScopedSourceChange}
              refreshToken={refreshToken}
              onSourcesChange={onSourcesChange}
            />

            <div className="space-y-3 border-t pt-4">
              <UploadZone onUpload={onUpload} compact />
              <UrlInput onSubmit={onUrlSubmit} />
            </div>
          </div>
        </aside>

        <main
          className={cn(
            "min-h-0",
            mobilePanel === "chat" ? "flex flex-col" : "hidden md:flex md:flex-col",
          )}
        >
          <ChatPanel
            workspaceHeaders={workspaceHeaders}
            sources={sources}
            scopedSourceId={scopedSourceId}
          />
        </main>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        workspaceHeaders={workspaceHeaders}
        onWorkspaceDeleted={onWorkspaceDeleted}
      />
    </div>
  );
}
