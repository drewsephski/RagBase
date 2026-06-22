"use client";

import { Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { RagBaseLogo } from "@/components/brand/ragbase-logo";
import { ChatInput } from "@/app/ui/chat/chat-input";
import { UrlInput } from "@/app/ui/home/url-input";
import { FileInputRow } from "@/app/ui/home/file-input-row";
import {
  WorkspaceSwitcher,
  type WorkspaceSwitcherProps,
} from "@/app/ui/workspace/workspace-switcher";

interface LandingHomeProps {
  onUrlSubmit: (
    url: string,
  ) => Promise<{ teaser?: boolean; message?: string; source?: { name: string } } | void>;
  onUpload: (file: File) => Promise<void>;
  onOpenSettings: () => void;
  disabled?: boolean;
  workspaceSwitcherProps: WorkspaceSwitcherProps;
}

export function LandingHome({
  onUrlSubmit,
  onUpload,
  onOpenSettings,
  disabled = false,
  workspaceSwitcherProps,
}: LandingHomeProps) {
  return (
    <div className="flex min-h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-3 pt-safe sm:px-6 sm:py-4">
        <WorkspaceSwitcher {...workspaceSwitcherProps} />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onOpenSettings}
            aria-label="Open settings"
          >
            <Settings aria-hidden />
          </Button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-4 sm:px-6 sm:pb-6">
        <RagBaseLogo
          layout="vertical"
          markSize={56}
          showTagline
          className="mb-6 sm:mb-10"
        />

        <div
          className="w-full max-w-xl space-y-2.5 sm:space-y-3"
          aria-label="Add a document or link"
        >
          <UrlInput onSubmit={onUrlSubmit} disabled={disabled} variant="minimal" />
          <FileInputRow onUpload={onUpload} disabled={disabled} />
        </div>
      </main>

      <div className="mt-auto shrink-0 border-t">
        <ChatInput
          value=""
          onChange={() => {}}
          onSubmit={() => {}}
          disabled
          showHint={false}
          placeholder="Add a link or file to start asking questions…"
        />
      </div>
    </div>
  );
}
