import type { WorkspaceTemplate } from "@/app/lib/templates";
import { Badge } from "@/components/ui/badge";
import { TEMPLATE_ICONS } from "@/lib/templates/icons";

/** Shared width for template workspace panels (banner, safe-use, prompts). */
export const TEMPLATE_WORKSPACE_WIDTH_CLASS = "w-full max-w-2xl";

interface TemplateBannerProps {
  template: WorkspaceTemplate;
  compact?: boolean;
}

export function TemplateBanner({ template, compact = false }: TemplateBannerProps) {
  const Icon = TEMPLATE_ICONS[template.id];

  if (compact) {
    return (
      <div className="bg-muted/40 border-b px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {template.tabLabel}
          </Badge>
          <p className="text-muted-foreground text-xs">{template.workspaceName}</p>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Workspace template"
      className="bg-muted/20 w-full space-y-3 rounded-lg border p-4 text-left sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span
          className="bg-muted/40 text-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-lg border sm:size-10"
          aria-hidden
        >
          <Icon className="size-4 sm:size-[18px]" />
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Template
            </Badge>
            <p className="text-muted-foreground text-xs">{template.workspaceName}</p>
          </div>

          <div className="space-y-1">
            <h2 className="text-pretty text-base font-semibold leading-snug sm:text-lg">
              {template.headline}
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">{template.subheadline}</p>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
        {template.description}
      </p>
    </section>
  );
}
