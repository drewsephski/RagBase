import {
  TEMPLATE_LIST,
  type TemplateId,
} from "@/lib/domain/templates";

export const ACTIVE_TEMPLATE_KEY = "ragbase:active-template";
export const PENDING_PROMPT_KEY = "ragbase:pending-prompt";

function templateWorkspaceKey(templateId: TemplateId): string {
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

function findTemplateIdForWorkspace(
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

export function resolveWorkspaceTemplateId(
  workspace: { id: string; templateId?: TemplateId },
  storage: Storage = localStorage,
): TemplateId | null {
  return workspace.templateId ?? findTemplateIdForWorkspace(workspace.id, storage);
}
