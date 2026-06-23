"use client";

import { useState } from "react";
import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QualityDebugPanelProps {
  sourceCount: number;
  citationCount: number;
  model: string;
  latencyMs: number | null;
  lastErrorCategory: string | null;
}

export function QualityDebugPanel({
  sourceCount,
  citationCount,
  model,
  latencyMs,
  lastErrorCategory,
}: QualityDebugPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="fixed bottom-20 right-3 z-40 sm:bottom-24 sm:right-4"
      aria-label="Quality debug panel"
    >
      <div className="relative">
        {open ? (
          <div
            className={cn(
              "bg-background/95 border-border absolute right-0 bottom-full mb-2 w-[min(16rem,85vw)] rounded-lg border p-3 text-xs shadow-lg backdrop-blur-sm",
            )}
          >
            <p className="text-muted-foreground mb-2 font-medium uppercase tracking-wide">
              Debug
            </p>
            <dl className="space-y-1.5">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Sources</dt>
                <dd className="font-mono tabular-nums">{sourceCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Citations</dt>
                <dd className="font-mono tabular-nums">{citationCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Model</dt>
                <dd className="max-w-[10rem] truncate font-mono text-right">
                  {model}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Latency</dt>
                <dd className="font-mono tabular-nums">
                  {latencyMs === null ? "—" : `${latencyMs} ms`}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Last error</dt>
                <dd className="font-mono">{lastErrorCategory ?? "—"}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shadow-md"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-label={open ? "Hide quality debug panel" : "Show quality debug panel"}
        >
          <Bug className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
