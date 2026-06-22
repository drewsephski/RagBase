"use client";

import { useEffect, useMemo, useState } from "react";
import {
  WORKSPACE_ID_KEY,
  WORKSPACE_SECRET_KEY,
} from "@/lib/workspace/keys";

export interface WorkspaceHeaders {
  "X-Workspace-Id": string;
  "X-Workspace-Secret": string;
}

interface WorkspaceState {
  workspaceId: string | null;
  workspaceSecret: string | null;
  headers: WorkspaceHeaders | null;
  isReady: boolean;
  error: string | null;
}

export function useWorkspace(): WorkspaceState {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceSecret, setWorkspaceSecret] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initWorkspace() {
      try {
        let id = localStorage.getItem(WORKSPACE_ID_KEY);
        let secret = localStorage.getItem(WORKSPACE_SECRET_KEY);

        if (!id || !secret) {
          const response = await fetch("/api/workspaces", { method: "POST" });

          if (!response.ok) {
            throw new Error("Could not start your private workspace.");
          }

          const data = (await response.json()) as {
            workspaceId: string;
            workspaceSecret: string;
          };

          id = data.workspaceId;
          secret = data.workspaceSecret;
          localStorage.setItem(WORKSPACE_ID_KEY, id);
          localStorage.setItem(WORKSPACE_SECRET_KEY, secret);
        }

        if (!cancelled) {
          setWorkspaceId(id);
          setWorkspaceSecret(secret);
          setIsReady(true);
        }
      } catch (initError) {
        if (!cancelled) {
          setError(
            initError instanceof Error
              ? initError.message
              : "Could not start your private workspace.",
          );
          setIsReady(true);
        }
      }
    }

    void initWorkspace();

    return () => {
      cancelled = true;
    };
  }, []);

  const headers = useMemo((): WorkspaceHeaders | null => {
    if (!workspaceId || !workspaceSecret) {
      return null;
    }

    return {
      "X-Workspace-Id": workspaceId,
      "X-Workspace-Secret": workspaceSecret,
    };
  }, [workspaceId, workspaceSecret]);

  return {
    workspaceId,
    workspaceSecret,
    headers,
    isReady,
    error,
  };
}
