"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function CitationDemo() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className="border-border/80 bg-card/60 relative w-full max-w-md rounded-xl border p-4 shadow-sm backdrop-blur-sm sm:p-5"
      aria-hidden
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="bg-muted size-2 rounded-full" />
        <span className="text-muted-foreground font-mono text-[11px] tracking-wide uppercase">
          lease-agreement.pdf
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-end">
          <p className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-md px-3 py-2 text-sm">
            What is the notice period to terminate?
          </p>
        </div>

        <div className="bg-muted/50 max-w-[92%] rounded-2xl rounded-bl-md px-3 py-2.5 text-sm leading-relaxed">
          <p>
            Either party may terminate with{" "}
            <span className="relative inline">
              <span className="relative z-10">60 days written notice</span>
              <span
                className={cn(
                  "bg-emerald-500/35 absolute bottom-0 left-0 h-[2px] rounded-full motion-reduce:w-full",
                  ready
                    ? "animate-[cite-draw_1s_ease-out_forwards] w-0"
                    : "w-0",
                )}
                aria-hidden
              />
            </span>{" "}
            before the lease end date
            <sup className="text-emerald-600 dark:text-emerald-400 ml-0.5 text-[10px] font-medium">
              1
            </sup>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
