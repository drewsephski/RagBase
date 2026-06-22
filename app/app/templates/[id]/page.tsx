import { redirect } from "next/navigation";
import { getTemplateAppPath, parseTemplateId } from "@/app/lib/templates";

interface TemplateAppRedirectPageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplateAppRedirectPage({
  params,
}: TemplateAppRedirectPageProps) {
  const { id } = await params;
  const templateId = parseTemplateId(id);

  if (!templateId) {
    redirect("/app");
  }

  redirect(getTemplateAppPath(templateId));
}
