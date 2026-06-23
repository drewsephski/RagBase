"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CreateWorkspaceOptions, StoredWorkspace } from "@/lib/domain/definitions";
import {
  getWorkspaceTemplate,
  parseTemplateId,
  type TemplateId,
  type WorkspaceTemplate,
} from "@/lib/domain/templates";
import {
  ACTIVE_TEMPLATE_KEY,
  readTemplateWorkspaceId,
  resolveWorkspaceTemplateId,
  writeTemplateWorkspaceId,
} from "@/lib/templates/keys";
import { loadRegistry } from "@/lib/workspace/registry";

interface UseWorkspaceTemplateOptions {
  isReady: boolean;
  workspaces: StoredWorkspace[];
  activeWorkspace: StoredWorkspace | null;
  createWorkspace: (options?: CreateWorkspaceOptions) => Promise<void>;
  switchWorkspace: (id: string) => void;
  templateRoutingDismissed?: boolean;
}

interface UseWorkspaceTemplateResult {
  template: WorkspaceTemplate | null;
  templateId: TemplateId | null;
  isApplyingTemplate: boolean;
}

export function useWorkspaceTemplate({
  isReady,
  workspaces,
  activeWorkspace,
  createWorkspace,
  switchWorkspace,
  templateRoutingDismissed = false,
}: UseWorkspaceTemplateOptions): UseWorkspaceTemplateResult {
  const searchParams = useSearchParams();
  const urlTemplateId = parseTemplateId(searchParams.get("template"));
  const workspaceTemplateId = activeWorkspace
    ? resolveWorkspaceTemplateId(activeWorkspace)
    : null;
  const routingTemplateId =
    !templateRoutingDismissed && urlTemplateId ? urlTemplateId : null;
  const templateId = routingTemplateId ?? workspaceTemplateId;
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const appliedTemplateRef = useRef<TemplateId | null>(null);
  const applyingLockRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (templateId) {
      sessionStorage.setItem(ACTIVE_TEMPLATE_KEY, templateId);
      return;
    }

    sessionStorage.removeItem(ACTIVE_TEMPLATE_KEY);
    appliedTemplateRef.current = null;
  }, [templateId]);

  useEffect(() => {
    if (templateRoutingDismissed) {
      appliedTemplateRef.current = templateId;
    }
  }, [templateId, templateRoutingDismissed]);

  const applyTemplate = useCallback(async () => {
    if (!urlTemplateId || templateRoutingDismissed) {
      return;
    }

    if (appliedTemplateRef.current === urlTemplateId || applyingLockRef.current) {
      return;
    }

    applyingLockRef.current = true;
    setIsApplyingTemplate(true);

    try {
      const template = getWorkspaceTemplate(urlTemplateId);
      const mappedWorkspaceId = readTemplateWorkspaceId(urlTemplateId);
      const mappedWorkspace = mappedWorkspaceId
        ? workspaces.find((workspace) => workspace.id === mappedWorkspaceId)
        : undefined;

      if (mappedWorkspace) {
        if (activeWorkspace?.id !== mappedWorkspace.id) {
          switchWorkspace(mappedWorkspace.id);
        }
        appliedTemplateRef.current = urlTemplateId;
        return;
      }

      const existingNamed = workspaces.find(
        (workspace) => workspace.name === template.workspaceName,
      );

      if (existingNamed) {
        writeTemplateWorkspaceId(urlTemplateId, existingNamed.id);
        if (activeWorkspace?.id !== existingNamed.id) {
          switchWorkspace(existingNamed.id);
        }
        appliedTemplateRef.current = urlTemplateId;
        return;
      }

      await createWorkspace({
        name: template.workspaceName,
        templateId: urlTemplateId,
      });
      const created = loadRegistry().find(
        (workspace) => workspace.name === template.workspaceName,
      );

      if (created) {
        writeTemplateWorkspaceId(urlTemplateId, created.id);
      }

      appliedTemplateRef.current = urlTemplateId;
    } finally {
      applyingLockRef.current = false;
      setIsApplyingTemplate(false);
    }
  }, [
    activeWorkspace?.id,
    createWorkspace,
    switchWorkspace,
    templateRoutingDismissed,
    urlTemplateId,
    workspaces,
  ]);

  useEffect(() => {
    if (!isReady || !urlTemplateId || templateRoutingDismissed) {
      return;
    }

    void applyTemplate();
  }, [applyTemplate, isReady, templateRoutingDismissed, urlTemplateId]);

  const template = useMemo(
    () => (templateId ? getWorkspaceTemplate(templateId) : null),
    [templateId],
  );

  return {
    template,
    templateId,
    isApplyingTemplate,
  };
}
