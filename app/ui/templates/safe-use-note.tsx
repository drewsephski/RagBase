"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ShieldAlert } from "lucide-react";
import { useCallback, useId, useState } from "react";
import type { WorkspaceTemplate } from "@/lib/domain/templates";

interface SafeUseNoteProps {
  safeUse: WorkspaceTemplate["safeUse"];
}

export function SafeUseNote({ safeUse }: SafeUseNoteProps) {
  const panelId = useId();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  const expandTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

  const chevronTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 32 };

  return (
    <div className="surface-panel w-full overflow-hidden rounded-2xl border text-left">
      <button
        type="button"
        className="hover:bg-muted/40 flex w-full cursor-pointer items-start gap-2.5 p-3 text-left transition-colors sm:gap-3 sm:p-4"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={handleToggle}
      >
        <ShieldAlert
          className="text-muted-foreground mt-0.5 size-4 shrink-0"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{safeUse.title}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed sm:text-sm">
            {safeUse.summary}
          </p>
          {!open ? (
            <span className="text-muted-foreground mt-2 inline-block text-xs underline-offset-4">
              Show what&apos;s safe to upload
            </span>
          ) : null}
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={chevronTransition}
          className="text-muted-foreground mt-0.5 shrink-0"
          aria-hidden
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            key="safe-use-panel"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={expandTransition}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  OK to use
                </p>
                <ul className="text-muted-foreground mt-2 list-disc space-y-1.5 pl-4 text-xs sm:text-sm">
                  {safeUse.safeItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Do not upload
                </p>
                <ul className="text-muted-foreground mt-2 list-disc space-y-1.5 pl-4 text-xs sm:text-sm">
                  {safeUse.avoidItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
                {safeUse.footer}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
