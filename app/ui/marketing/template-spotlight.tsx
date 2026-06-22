"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
} from "lucide-react";
import { useId, useState } from "react";
import {
  getTemplateAppPath,
  getTemplateLandingPath,
  getWorkspaceTemplate,
  TEMPLATE_LIST,
  type TemplateId,
  type WorkspaceTemplate,
} from "@/app/lib/templates";
import { TEMPLATE_ICONS } from "@/lib/templates/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function TemplateCard({ template }: { template: WorkspaceTemplate }) {
  const Icon = TEMPLATE_ICONS[template.id];
  const appPath = getTemplateAppPath(template.id);
  const landingPath = getTemplateLandingPath(template.id);

  return (
    <div className="bg-muted/20 grid gap-8 rounded-xl border p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-10">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            Template
          </Badge>
          <p className="text-muted-foreground text-xs">{template.workspaceName}</p>
        </div>

        <div className="bg-muted/40 text-foreground inline-flex size-10 items-center justify-center rounded-lg border">
          <Icon className="size-[18px]" aria-hidden />
        </div>

        <div className="space-y-2">
          <h3 className="text-pretty text-xl font-semibold tracking-tight sm:text-2xl">
            {template.headline}
          </h3>
          <p className="text-muted-foreground text-sm">{template.subheadline}</p>
          <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
            {template.description}
          </p>
        </div>

        <ul className="text-muted-foreground list-disc space-y-1.5 pl-4 text-sm">
          {template.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row md:min-w-[12rem] md:flex-col md:items-stretch">
        <Button asChild className="group h-11 gap-2">
          <Link href={appPath}>
            Open template
            <ArrowRight className="icon-arrow-nudge size-4" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11">
          <Link href={landingPath}>Learn more</Link>
        </Button>
      </div>
    </div>
  );
}

export function TemplateSpotlight() {
  const defaultTemplate = TEMPLATE_LIST[0];
  const layoutGroupId = useId();
  const reduceMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<TemplateId>(
    defaultTemplate?.id ?? "hospital-qi",
  );

  if (!defaultTemplate) {
    return null;
  }

  const activeTemplate = getWorkspaceTemplate(activeId);
  const slideTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 34 };
  const contentTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <section
      id="templates"
      aria-labelledby="templates-heading"
      className="border-t px-4 py-14 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 max-w-2xl sm:mb-10">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">
            Templates
          </p>
          <h2
            id="templates-heading"
            className="text-pretty text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Start with a workspace built for your job
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">
            Each template includes tailored prompts, safe-use guidance, and a
            pre-named workspace — pick one and add your first document.
          </p>
        </div>

        <div className="space-y-6">
          <div
            role="tablist"
            aria-label="Workspace templates"
            className="bg-muted/40 -mx-1 overflow-x-auto rounded-lg border p-1 [scrollbar-width:none] sm:mx-0 [&::-webkit-scrollbar]:hidden"
          >
            <div className="inline-flex min-w-full gap-1 sm:min-w-0">
              {TEMPLATE_LIST.map((template) => {
                const isActive = template.id === activeId;

                return (
                  <button
                    key={template.id}
                    type="button"
                    role="tab"
                    id={`template-tab-${template.id}`}
                    aria-selected={isActive}
                    aria-controls={`template-panel-${template.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveId(template.id)}
                    onKeyDown={(event) => {
                      const index = TEMPLATE_LIST.findIndex(
                        (entry) => entry.id === template.id,
                      );
                      if (index === -1) {
                        return;
                      }

                      if (event.key === "ArrowRight") {
                        event.preventDefault();
                        const next = TEMPLATE_LIST[index + 1] ?? TEMPLATE_LIST[0];
                        if (next) {
                          setActiveId(next.id);
                        }
                      }

                      if (event.key === "ArrowLeft") {
                        event.preventDefault();
                        const previous =
                          TEMPLATE_LIST[index - 1] ??
                          TEMPLATE_LIST[TEMPLATE_LIST.length - 1];
                        if (previous) {
                          setActiveId(previous.id);
                        }
                      }
                    }}
                    className={cn(
                      "relative z-10 inline-flex min-h-9 shrink-0 items-center justify-center rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none sm:px-4 sm:text-sm",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId={`${layoutGroupId}-template-tab-indicator`}
                        className="bg-background absolute inset-0 rounded-md shadow-sm"
                        transition={slideTransition}
                      />
                    ) : null}
                    <span className="relative z-10">{template.tabLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeId}
                role="tabpanel"
                id={`template-panel-${activeId}`}
                aria-labelledby={`template-tab-${activeId}`}
                initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -24 }}
                transition={contentTransition}
              >
                <TemplateCard template={activeTemplate} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
