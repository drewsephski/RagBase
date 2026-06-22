"use client";

import { Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { RagBaseLogo } from "@/components/brand/ragbase-logo";
import { ChatInput } from "@/app/ui/chat/chat-input";
import { UrlInput } from "@/app/ui/home/url-input";
import { FileInputRow } from "@/app/ui/home/file-input-row";

interface LandingHomeProps {
  onUrlSubmit: (
    url: string,
  ) => Promise<{ teaser?: boolean; message?: string; source?: { name: string } } | void>;
  onUpload: (file: File) => Promise<void>;
  onOpenSettings: () => void;
  disabled?: boolean;
}

export function LandingHome({
  onUrlSubmit,
  onUpload,
  onOpenSettings,
  disabled = false,
}: LandingHomeProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-end gap-2 px-4 py-4 sm:px-6">
        <ThemeToggle />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          aria-label="Open settings"
        >
          <Settings aria-hidden />
        </Button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-6 sm:px-6">
        <RagBaseLogo
          layout="vertical"
          markSize={64}
          showTagline
          className="mb-10"
        />

        <div
          className="w-full max-w-xl space-y-3"
          aria-label="Add a document or link"
        >
          <UrlInput onSubmit={onUrlSubmit} disabled={disabled} variant="minimal" />
          <FileInputRow onUpload={onUpload} disabled={disabled} />
        </div>
      </main>

      <div className="mt-auto border-t">
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
