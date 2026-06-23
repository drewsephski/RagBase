import Link from "next/link";
import { ArrowRight, Link2 } from "lucide-react";
import type { TemplateId, WorkspaceTemplate } from "@/lib/domain/templates";
import { buildPromptAppUrl } from "@/lib/templates/prompt-link";

interface TemplatePromptLinksProps {
  template: WorkspaceTemplate;
  limit?: number;
}

export function TemplatePromptLinks({
  template,
  limit = 4,
}: TemplatePromptLinksProps) {
  const prompts = template.promptChips.slice(0, limit);

  if (prompts.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 text-left" aria-labelledby="template-prompt-links-heading">
      <div className="space-y-1">
        <h2
          id="template-prompt-links-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Shareable example questions
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Each link opens this template with the question queued — your teammate
          only needs to add a document.
        </p>
      </div>

      <ul className="space-y-2">
        {prompts.map((prompt) => {
          const href = buildPromptAppUrl(prompt, { templateId: template.id });

          if (!href) {
            return null;
          }

          return (
            <li key={prompt}>
              <Link
                href={href}
                className="hover:bg-accent/60 focus-visible:ring-ring group flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <Link2
                  className="text-muted-foreground mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 leading-snug">{prompt}</span>
                <ArrowRight
                  className="text-muted-foreground mt-0.5 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function getTemplatePromptSharePath(
  templateId: TemplateId,
  prompt: string,
): string | null {
  return buildPromptAppUrl(prompt, { templateId });
}
