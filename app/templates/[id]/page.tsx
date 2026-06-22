import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  getTemplateAppPath,
  getWorkspaceTemplate,
  parseTemplateId,
  TEMPLATE_LIST,
} from "@/app/lib/templates";
import { APP_PATH, SITE_NAME } from "@/app/lib/site";
import { Button } from "@/components/ui/button";
import { SafeUseNote } from "@/app/ui/templates/safe-use-note";
import { TemplateBanner } from "@/app/ui/templates/template-banner";
import { LandingHeader } from "@/app/ui/marketing/landing-header";

interface TemplatePageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return TEMPLATE_LIST.map((template) => ({ id: template.id }));
}

export async function generateMetadata({
  params,
}: TemplatePageProps): Promise<Metadata> {
  const { id } = await params;
  const templateId = parseTemplateId(id);

  if (!templateId) {
    return { title: "Template not found" };
  }

  const template = getWorkspaceTemplate(templateId);

  return {
    title: template.workspaceName,
    description: template.description,
    openGraph: {
      title: `${template.workspaceName} · ${SITE_NAME}`,
      description: template.description,
    },
  };
}

export default async function TemplateLandingPage({ params }: TemplatePageProps) {
  const { id } = await params;
  const templateId = parseTemplateId(id);

  if (!templateId) {
    notFound();
  }

  const template = getWorkspaceTemplate(templateId);
  const appPath = getTemplateAppPath(template.id);

  return (
    <div className="landing-grid flex min-h-dvh flex-col">
      <LandingHeader />

      <main className="flex flex-1 flex-col items-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-2xl space-y-6 sm:space-y-8">
          <TemplateBanner template={template} />

          <SafeUseNote safeUse={template.safeUse} />

          <section className="space-y-3 text-left">
            <h2 className="text-lg font-semibold tracking-tight">Suggested workflow</h2>
            <ol className="text-muted-foreground list-decimal space-y-2 pl-5 text-sm leading-relaxed sm:text-base">
              {template.workflowSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="group h-11 gap-2 px-6">
              <Link href={appPath}>
                Open {template.workspaceName}
                <ArrowRight className="icon-arrow-nudge size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="text-muted-foreground h-11">
              <Link href={APP_PATH}>Use default workspace instead</Link>
            </Button>
          </div>

          <p className="text-muted-foreground text-xs sm:text-sm">
            Free. No account. Private to this browser. Share this link:{" "}
            <span className="text-foreground font-medium">{appPath}</span>
          </p>
        </div>
      </main>
    </div>
  );
}
