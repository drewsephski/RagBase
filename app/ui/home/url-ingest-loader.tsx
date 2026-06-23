"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const INGEST_STAGES = [
  "Connecting to host…",
  "Fetching page…",
  "Extracting text…",
  "Preparing your document…",
] as const;

interface UrlIngestLoaderProps {
  url: string;
  variant?: "default" | "compact";
  className?: string;
}

function getHostname(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] ?? url;
  }
}

function getPathHint(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const hint = `${path}${parsed.search}`.slice(0, 48);
    return hint.length > 0 ? hint : null;
  } catch {
    return null;
  }
}

export function UrlIngestLoader({
  url,
  variant = "default",
  className,
}: UrlIngestLoaderProps) {
  const [stageIndex, setStageIndex] = useState(0);

  const hostname = useMemo(() => getHostname(url), [url]);
  const pathHint = useMemo(() => getPathHint(url), [url]);
  const stage = INGEST_STAGES[stageIndex] ?? INGEST_STAGES[0];
  const progress = ((stageIndex + 1) / INGEST_STAGES.length) * 100;

  useEffect(() => {
    setStageIndex(0);

    const intervalId = window.setInterval(() => {
      setStageIndex((current) =>
        current < INGEST_STAGES.length - 1 ? current + 1 : current,
      );
    }, 1800);

    return () => window.clearInterval(intervalId);
  }, [url]);

  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "url-ingest-loader overflow-hidden rounded-xl border",
        isCompact ? "px-3 py-2.5" : "px-4 py-3.5 sm:px-5 sm:py-4",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={`Reading ${hostname}. ${stage}`}
    >
      <div
        className={cn(
          "flex gap-3",
          isCompact ? "items-center" : "items-start sm:gap-4",
        )}
      >
        <DocumentPreview compact={isCompact} />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-0.5">
            <p
              className={cn(
                "font-mono font-medium tracking-tight text-[var(--url-ingest-accent)]",
                isCompact ? "truncate text-[11px]" : "truncate text-xs sm:text-sm",
              )}
              title={url}
            >
              {hostname}
              {pathHint ? (
                <span className="text-muted-foreground font-normal">
                  {pathHint}
                </span>
              ) : null}
            </p>
            <p
              className={cn(
                "text-foreground/90 font-medium",
                isCompact ? "text-[11px]" : "text-sm",
              )}
            >
              {stage}
            </p>
          </div>

          <div className="space-y-1">
            <div
              className="bg-muted/80 relative h-1 overflow-hidden rounded-full"
              aria-hidden
            >
              <div
                className="url-ingest-progress-fill absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${progress}%` }}
              />
              <div className="url-ingest-progress-shimmer absolute inset-0 rounded-full" />
            </div>

            {!isCompact ? (
              <ol
                className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] sm:text-[11px]"
                aria-hidden
              >
                {INGEST_STAGES.map((label, index) => (
                  <li
                    key={label}
                    className={cn(
                      "transition-opacity duration-500",
                      index <= stageIndex ? "opacity-100" : "opacity-35",
                    )}
                  >
                    {label.replace("…", "")}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentPreview({ compact }: { compact: boolean }) {
  const lineWidths = compact
    ? ["w-[82%]", "w-full", "w-[68%]"]
    : ["w-[88%]", "w-full", "w-[76%]", "w-[92%]", "w-[58%]"];

  return (
    <div
      className={cn(
        "url-ingest-doc relative shrink-0 overflow-hidden rounded-md border bg-[color-mix(in_oklch,var(--background)_65%,transparent)]",
        compact ? "size-10" : "size-14 sm:size-16",
      )}
      aria-hidden
    >
      <div
        className={cn(
          "flex h-full flex-col justify-center gap-[3px]",
          compact ? "px-1.5 py-1.5" : "gap-1 px-2 py-2 sm:px-2.5 sm:py-2.5",
        )}
      >
        {lineWidths.map((widthClass, index) => (
          <div
            key={widthClass}
            className={cn(
              "url-ingest-line h-[2px] rounded-full bg-[var(--url-ingest-line)]",
              widthClass,
            )}
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </div>

      <div className="url-ingest-scan absolute inset-x-0 top-0 h-[2px]" />
      <div className="url-ingest-scan-glow absolute inset-x-0 top-0 h-6" />
    </div>
  );
}
