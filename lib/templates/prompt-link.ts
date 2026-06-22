import type { TemplateId } from "@/app/lib/templates";
import { APP_PATH } from "@/app/lib/site";

export const PROMPT_URL_PARAM = "prompt";
export const MAX_SHAREABLE_PROMPT_LENGTH = 500;

export function parsePromptUrlParam(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) {
    return null;
  }

  let decoded: string;

  try {
    decoded = decodeURIComponent(value.trim());
  } catch {
    return null;
  }

  const normalized = decoded.replace(/\s+/g, " ").trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_SHAREABLE_PROMPT_LENGTH
  ) {
    return null;
  }

  return normalized;
}

export interface BuildPromptAppUrlOptions {
  templateId?: TemplateId;
  basePath?: string;
}

export function buildPromptAppUrl(
  prompt: string,
  options?: BuildPromptAppUrlOptions,
): string | null {
  const normalized = prompt.replace(/\s+/g, " ").trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_SHAREABLE_PROMPT_LENGTH
  ) {
    return null;
  }

  const params = new URLSearchParams();

  if (options?.templateId) {
    params.set("template", options.templateId);
  }

  params.set(PROMPT_URL_PARAM, normalized);

  const basePath = options?.basePath ?? APP_PATH;
  return `${basePath}?${params.toString()}`;
}

export function buildAbsolutePromptAppUrl(
  prompt: string,
  options?: BuildPromptAppUrlOptions & { origin?: string },
): string | null {
  const relative = buildPromptAppUrl(prompt, options);

  if (!relative) {
    return null;
  }

  const origin = options?.origin?.replace(/\/$/, "") ?? "";

  if (!origin) {
    return relative;
  }

  return `${origin}${relative}`;
}
