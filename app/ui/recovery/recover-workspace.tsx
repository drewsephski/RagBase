"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { APP_PATH } from "@/lib/domain/site";
import { apiJson } from "@/lib/api/client";
import { supportMailto } from "@/lib/support";
import { restoreWorkspaceFromRecovery } from "@/lib/workspace/registry";
import { Button } from "@/components/ui/button";

type RecoverState =
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; message: string };

export function RecoverWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<RecoverState>({ status: "loading" });

  useEffect(() => {
    const token = searchParams.get("token")?.trim();

    if (!token) {
      setState({ status: "error", message: "This recovery link is missing a token." });
      return;
    }

    let cancelled = false;

    async function recover() {
      try {
        const result = await apiJson<{ workspaceId: string; workspaceSecret: string }>(
          "/api/workspaces/recover",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          },
        );

        if (cancelled) {
          return;
        }

        restoreWorkspaceFromRecovery(result.workspaceId, result.workspaceSecret);
        setState({ status: "success" });
        router.replace(APP_PATH);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "This recovery link is invalid or expired.",
        });
      }
    }

    void recover();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" aria-hidden />
        <p className="text-sm">Restoring your workspace…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-lg font-semibold">Could not restore workspace</h1>
        <p className="text-muted-foreground text-sm">{state.message}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="secondary" onClick={() => router.replace(APP_PATH)}>
            Go to app
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href={supportMailto("Recovery link issue")}>Contact support</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <Loader2 className="text-muted-foreground size-8 animate-spin" aria-hidden />
      <p className="text-sm">Workspace restored. Opening your app…</p>
    </div>
  );
}
