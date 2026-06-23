"use client";

import { Settings } from "lucide-react";
import type { WorkspaceTemplate } from "@/lib/domain/templates";
import type { SubscriptionStatusResponse } from "@/lib/billing/types";
import type { WorkspaceHeaders } from "@/hooks/use-workspace";
import type { UrlIngestResult } from "@/hooks/use-ingestion";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { RagBaseLogo } from "@/components/brand/ragbase-logo";
import { ChatInput } from "@/app/ui/chat/chat-input";
import { UrlInput } from "@/app/ui/home/url-input";
import { FileInputRow } from "@/app/ui/home/file-input-row";
import { PromptChips } from "@/app/ui/home/prompt-chips";
import { TrustMicrocopy } from "@/app/ui/home/trust-microcopy";
import { BetaFeedbackCta } from "@/app/ui/feedback/beta-feedback-cta";
import { PlanPromoCard } from "@/app/ui/billing/plan-promo-card";
import { ProNavBadge } from "@/app/ui/billing/pro-nav-badge";
import { SafeUseNote } from "@/app/ui/templates/safe-use-note";
import {
  TEMPLATE_WORKSPACE_WIDTH_CLASS,
  TemplateBanner,
} from "@/app/ui/templates/template-banner";
import {
  WorkspaceSwitcher,
  type WorkspaceSwitcherProps,
} from "@/app/ui/workspace/workspace-switcher";
import { cn } from "@/lib/utils";

interface LandingHomeProps {
  onUrlSubmit: (url: string) => Promise<UrlIngestResult | void>;
  onUpload: (file: File) => Promise<void>;
  onOpenSettings: () => void;
  onPromptChipSelect?: (prompt: string) => void;
  onFullSitePaywallOpen?: () => void;
  subscription?: SubscriptionStatusResponse | null;
  workspaceHeaders?: WorkspaceHeaders | null;
  pendingPromptHint?: string | null;
  disabled?: boolean;
  template?: WorkspaceTemplate | null;
  workspaceSwitcherProps: WorkspaceSwitcherProps;
}

export function LandingHome({
  onUrlSubmit,
  onUpload,
  onOpenSettings,
  onPromptChipSelect,
  onFullSitePaywallOpen,
  subscription = null,
  workspaceHeaders = null,
  pendingPromptHint,
  disabled = false,
  template = null,
  workspaceSwitcherProps,
}: LandingHomeProps) {
  return (
    <div className="chat-surface flex min-h-dvh flex-col overflow-hidden">
      <header className="border-border/60 bg-background/80 flex shrink-0 items-center justify-between gap-2 px-safe py-3 backdrop-blur-md pt-safe sm:px-6 sm:py-4">
        <WorkspaceSwitcher {...workspaceSwitcherProps} />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ProNavBadge workspaceHeaders={workspaceHeaders} subscription={subscription} />
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

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-safe pb-4 sm:pb-6">
        <div
          className={cn(
            "mx-auto space-y-5 sm:space-y-6",
            template ? TEMPLATE_WORKSPACE_WIDTH_CLASS : "w-full max-w-xl",
          )}
        >
          {template ? (
            <TemplateBanner template={template} />
          ) : (
            <div className="space-y-3 text-center sm:space-y-4">
              <RagBaseLogo
                layout="vertical"
                markSize={56}
                showTagline
                className="mx-auto max-sm:[&_p:first-of-type]:text-xl"
              />
              <div className="mx-auto max-w-md space-y-2">
                <h1 className="text-pretty text-lg font-medium leading-snug tracking-tight sm:text-xl">
                  Chat with PDFs, contracts, notes, and webpages
                </h1>
                <p className="text-muted-foreground text-pretty text-sm leading-relaxed">
                  No signup · Cited answers · Private workspace saved in this
                  browser
                </p>
              </div>
            </div>
          )}

          <div
            className="space-y-2.5 sm:space-y-3"
            aria-label="Add a document or link"
          >
            <UrlInput onSubmit={onUrlSubmit} disabled={disabled} variant="minimal" />
            <PlanPromoCard
              workspaceHeaders={workspaceHeaders}
              subscription={subscription}
              onPaywallOpen={onFullSitePaywallOpen}
              surface="landing"
            />
            <FileInputRow onUpload={onUpload} disabled={disabled} />
            <TrustMicrocopy />
            <BetaFeedbackCta />
          </div>

          {template ? <SafeUseNote safeUse={template.safeUse} /> : null}

          {onPromptChipSelect ? (
            <PromptChips
              prompts={template?.promptChips}
              onSelect={onPromptChipSelect}
              disabled={disabled}
              columns={template ? 2 : 1}
              templateId={template?.id ?? null}
              enableShareLinks={Boolean(template)}
              label={template ? "Example questions:" : "Try asking:"}
              hint={
                pendingPromptHint ??
                (template
                  ? "Pick a question now — we'll ask it automatically once your first document is ready. Copy a link to share a question with a teammate."
                  : "Pick a question — we'll send it when your document is ready.")
              }
            />
          ) : null}
        </div>
      </main>

      <div className="mt-auto shrink-0">
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
