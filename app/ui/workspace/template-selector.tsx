"use client";

import { Check, FolderOpen, type LucideIcon } from "lucide-react";
import { TEMPLATE_LIST, type TemplateId } from "@/lib/domain/templates";
import { TEMPLATE_ICONS } from "@/lib/templates/icons";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type TemplateSelectorValue = TemplateId | "";

interface TemplateSelectorProps {
  value: TemplateSelectorValue;
  onChange: (value: TemplateSelectorValue) => void;
  disabled?: boolean;
}

interface TemplateOptionProps {
  selected: boolean;
  onSelect: () => void;
  icon: LucideIcon;
  title: string;
  description: string;
  disabled?: boolean;
}

function TemplateOption({
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
  disabled = false,
}: TemplateOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "hover:bg-accent/60 flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        selected
          ? "border-primary/50 bg-primary/5 ring-primary/20 ring-1"
          : "border-transparent bg-transparent",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md border",
          selected ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/40 text-foreground",
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>

      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-sm font-medium">{title}</span>
        <span className="text-muted-foreground block text-xs leading-snug">{description}</span>
      </span>

      {selected ? (
        <Check className="text-primary mt-1 size-4 shrink-0" aria-hidden />
      ) : (
        <span className="mt-1 size-4 shrink-0" aria-hidden />
      )}
    </button>
  );
}

export function TemplateSelector({
  value,
  onChange,
  disabled = false,
}: TemplateSelectorProps) {
  return (
    <div className="space-y-2">
      <Label id="workspace-template-label">Template (optional)</Label>

      <ScrollArea
        className="h-[min(17.5rem,40vh)] rounded-md border"
        aria-labelledby="workspace-template-label"
      >
        <div
          role="radiogroup"
          aria-labelledby="workspace-template-label"
          className="space-y-1 p-1"
        >
          <TemplateOption
            selected={value === ""}
            onSelect={() => onChange("")}
            icon={FolderOpen}
            title="Blank workspace"
            description="No tailored prompts or safe-use guidance"
            disabled={disabled}
          />

          {TEMPLATE_LIST.map((template) => {
            const Icon = TEMPLATE_ICONS[template.id];

            return (
              <TemplateOption
                key={template.id}
                selected={value === template.id}
                onSelect={() => onChange(template.id)}
                icon={Icon}
                title={template.tabLabel}
                description={template.headline}
                disabled={disabled}
              />
            );
          })}
        </div>
      </ScrollArea>

      <p className="text-muted-foreground text-xs">
        Templates add tailored prompts, safe-use guidance, and starter questions.
      </p>
    </div>
  );
}
