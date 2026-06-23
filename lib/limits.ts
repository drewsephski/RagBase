import { LIMITS } from "@/lib/domain/definitions";
import { createServiceClient } from "@/lib/supabase/server";

export class LimitError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "LimitError";
    this.status = status;
  }
}

export function checkFileSize(bytes: number): void {
  if (bytes > LIMITS.MAX_FILE_BYTES) {
    throw new LimitError(
      `File too large. Maximum size is ${LIMITS.MAX_FILE_BYTES / (1024 * 1024)} MB.`,
      413,
    );
  }
}

export function checkPdfPages(pageCount: number): void {
  if (pageCount > LIMITS.MAX_PDF_PAGES) {
    throw new LimitError(
      `PDF has too many pages. Maximum is ${LIMITS.MAX_PDF_PAGES} pages.`,
    );
  }
}

export async function checkSourceLimit(workspaceId: string): Promise<void> {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from("sources")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new Error("Failed to check source limit");
  }

  if ((count ?? 0) >= LIMITS.MAX_SOURCES) {
    throw new LimitError(
      `You've reached the limit of ${LIMITS.MAX_SOURCES} documents in this workspace. Delete one to add more, or save a higher-limit plan for later.`,
    );
  }
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function checkMessageLimit(
  workspaceId: string,
  hasUserKey: boolean,
): Promise<void> {
  const supabase = createServiceClient();
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("message_count, message_count_date")
    .eq("id", workspaceId)
    .single();

  if (error || !workspace) {
    throw new Error("Failed to check message limit");
  }

  const today = todayUtc();
  const count =
    workspace.message_count_date === today ? workspace.message_count : 0;
  const limit = hasUserKey
    ? LIMITS.MAX_MESSAGES_DAY_WITH_KEY
    : LIMITS.MAX_MESSAGES_DAY;

  if (count >= limit) {
    throw new LimitError(
      `Daily message limit reached (${limit}/day). Try again tomorrow${hasUserKey ? "" : ", add your OpenRouter key in Settings, or save a higher-limit plan for later"}.`,
      429,
    );
  }
}

export async function incrementMessageCount(workspaceId: string): Promise<void> {
  const supabase = createServiceClient();
  const today = todayUtc();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("message_count, message_count_date")
    .eq("id", workspaceId)
    .single();

  const currentCount =
    workspace?.message_count_date === today
      ? (workspace.message_count ?? 0)
      : 0;

  await supabase
    .from("workspaces")
    .update({
      message_count: currentCount + 1,
      message_count_date: today,
    })
    .eq("id", workspaceId);
}
