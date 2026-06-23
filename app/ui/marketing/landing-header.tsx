"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RagBaseLogo } from "@/components/brand/ragbase-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { APP_PATH } from "@/lib/domain/site";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 px-safe pt-safe backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="min-w-0 shrink rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="RagBase home"
        >
          <RagBaseLogo markSize={28} className="min-w-0" />
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm" className="group gap-1.5">
            <Link href={APP_PATH}>
              Open workspace
              <ArrowRight className="icon-arrow-nudge size-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
