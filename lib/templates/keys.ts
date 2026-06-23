import {
  parseTemplateId,
  TEMPLATE_LIST,
  type TemplateId,
} from "@/lib/domain/templates";

export const ACTIVE_TEMPLATE_KEY = "ragbase:active-template";
export const PENDING_PROMPT_KEY = "ragbase:pending-prompt";

export function templateWorkspaceKey(templateId: TemplateId): string {
  return `ragbase:template-workspace:${templateId}`;
}

export function writeTemplateWorkspaceId(
  templateId: TemplateId,
  workspaceId: string,
  storage: Storage = localStorage,
): void {
  storage.setItem(templateWorkspaceKey(templateId), workspaceId);
}

export function readTemplateWorkspaceId(
  templateId: TemplateId,
  storage: Storage = localStorage,
): string | null {
  return storage.getItem(templateWorkspaceKey(templateId));
}

export function findTemplateIdForWorkspace(
  workspaceId: string,
  storage: Storage = localStorage,
): TemplateId | null {
  for (const template of TEMPLATE_LIST) {
    if (readTemplateWorkspaceId(template.id, storage) === workspaceId) {
      return template.id;
    }
  }

  return null;
}

export function setActiveTemplate(templateId: TemplateId): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(ACTIVE_TEMPLATE_KEY, templateId);
}

export function readActiveTemplateId(): TemplateId | null {
  if (typeof window === "undefined") {
    return null;
  }

  return parseTemplateId(sessionStorage.getItem(ACTIVE_TEMPLATE_KEY));
}

export function clearActiveTemplate(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(ACTIVE_TEMPLATE_KEY);
}

export function resolveWorkspaceTemplateId(
  workspace: { id: string; templateId?: TemplateId },
  storage: Storage = localStorage,
): TemplateId | null {
  return workspace.templateId ?? findTemplateIdForWorkspace(workspace.id, storage);
}
